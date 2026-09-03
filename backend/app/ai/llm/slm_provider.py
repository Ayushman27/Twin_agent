"""
SLM Provider — Local Small Language Model (Qwen/Qwen3-4B-Base + LoRA adapter)
Activated when LLM_PROVIDER=slm.
"""
import asyncio
import os
import re
from typing import AsyncIterator, Optional
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

from app.ai.llm.interface import AIProvider
from app.core.config import settings


def smart_truncate(text: str, expected_length: int = 500) -> str:
    """
    Post-processing step since the model does not reliably emit EOS:
    - Cap output at ~1.5x expected length
    - Trim to the last complete sentence (. ? ! or newline)
    - Don't cut mid-word
    """
    if not text:
        return ""
    
    # Strip any dangling prompt artifacts or assistant tags
    cleaned = text.strip()
    for stop_seq in ["<|im_end|>", "<|endoftext|>", "<|assistant|>", "<|user|>", "<|system|>"]:
        if stop_seq in cleaned:
            cleaned = cleaned.split(stop_seq)[0].strip()

    max_len = int(expected_length * 1.5)
    if len(cleaned) <= max_len:
        return cleaned

    # Truncate to max_len
    truncated = cleaned[:max_len]

    # Don't cut mid-word: find last whitespace
    last_space = truncated.rfind(" ")
    if last_space != -1 and last_space > max_len * 0.7:
        truncated = truncated[:last_space]

    # Trim to the last complete sentence (. ? ! or newline)
    sentence_ends = [m.end() for m in re.finditer(r"[\.\?\!\n]", truncated)]
    if sentence_ends:
        last_sentence_end = max(sentence_ends)
        # Ensure we keep a reasonable amount of text (at least 40% of max_len)
        if last_sentence_end >= int(max_len * 0.4):
            return truncated[:last_sentence_end].strip()

    return truncated.strip()


class SLMProvider(AIProvider):
    _instance: Optional["SLMProvider"] = None
    _model = None
    _tokenizer = None

    def __init__(self):
        if SLMProvider._model is None:
            self._load_model()

    @classmethod
    def _load_model(cls):
        base_model_name = getattr(settings, "SLM_BASE_MODEL", "Qwen/Qwen3-4B-Base")
        adapter_path = getattr(settings, "SLM_MODEL_PATH", "./slm_v1_adapter")
        
        # Check if adapter_path is relative and resolve to absolute
        if not os.path.isabs(adapter_path) and not os.path.exists(adapter_path):
            # Attempt to find it relative to workspace or backend root
            potential_paths = [
                os.path.abspath(adapter_path),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../slm_v1_adapter")),
                os.path.abspath(os.path.join(os.getcwd(), "slm_v1_adapter")),
                os.path.abspath(os.path.join(os.getcwd(), "../slm_v1_adapter")),
                os.path.abspath(os.path.join(os.getcwd(), "../../slm_v1_adapter")),
            ]
            for p in potential_paths:
                if os.path.exists(p) and os.path.isdir(p):
                    adapter_path = p
                    break

        cls._tokenizer = AutoTokenizer.from_pretrained(
            adapter_path if os.path.exists(os.path.join(adapter_path, "tokenizer_config.json")) else base_model_name,
            trust_remote_code=True
        )

        has_cuda = torch.cuda.is_available()
        if has_cuda:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True,
                torch_dtype=torch.float16,
            )
        else:
            # CPU / non-CUDA fallback (using bfloat16 or float16 to keep memory under 8GB)
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                dtype=torch.float16,
                device_map="cpu",
                trust_remote_code=True,
                low_cpu_mem_usage=True,
            )

        if os.path.exists(adapter_path):
            cls._model = PeftModel.from_pretrained(base_model, adapter_path)
        else:
            cls._model = base_model

        cls._model.eval()

    def _format_prompt(self, system_prompt: str, user_message: str) -> str:
        """
        Formats prompt using exact training format:
        <|system|>\nYou are a helpful {role} assistant at the company.\n<|user|>\n{instruction}\n\nContext: {context}\n<|assistant|>\n
        """
        # Extract role if present in system_prompt or user_message
        role = "company"
        if "role=" in system_prompt.lower() or "you are a" in system_prompt.lower():
            match = re.search(r"you are a(?: helpful)? ([a-zA-Z\s]+?)(?: assistant| at|\.|$)", system_prompt, re.IGNORECASE)
            if match:
                role = match.group(1).strip()
            elif "hr" in system_prompt.lower():
                role = "HR"

        # Check if instruction and context are explicitly given or split
        instruction = user_message
        context = ""
        
        # Check if user_message has Context: section
        if "Context:" in user_message:
            parts = user_message.split("Context:", 1)
            instruction = parts[0].strip()
            context = parts[1].strip()
        elif "context=" in user_message:
            match = re.search(r"instruction=[\"']?(.*?)[\"']?(?:,\s*context=[\"']?(.*?)[\"']?)?$", user_message, re.DOTALL)
            if match:
                instruction = match.group(1) or ""
                context = match.group(2) or ""

        # Exact prompt template from training
        prompt = (
            f"<|system|>\n"
            f"You are a helpful {role} assistant at the company.\n"
            f"<|user|>\n"
            f"{instruction}\n\nContext: {context}\n"
            f"<|assistant|>\n"
        )
        return prompt

    def _sync_generate(self, system_prompt: str, user_message: str, max_new_tokens: int = 512) -> str:
        prompt = self._format_prompt(system_prompt, user_message)
        inputs = self._tokenizer(prompt, return_tensors="pt")
        
        device = next(self._model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            output_tokens = self._model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                repetition_penalty=1.3,
                no_repeat_ngram_size=3,
                pad_token_id=self._tokenizer.pad_token_id if self._tokenizer.pad_token_id is not None else self._tokenizer.eos_token_id
            )

        input_length = inputs["input_ids"].shape[1]
        generated_tokens = output_tokens[0][input_length:]
        raw_output = self._tokenizer.decode(generated_tokens, skip_special_tokens=True)
        
        return smart_truncate(raw_output, expected_length=max_new_tokens)

    async def generate(self, system_prompt: str, user_message: str) -> str:
        return await asyncio.to_thread(
            self._sync_generate,
            system_prompt,
            user_message,
            settings.LLM_MAX_TOKENS
        )

    async def stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        full_text = await self.generate(system_prompt, user_message)
        for token in full_text.split(" "):
            yield token + " "
            await asyncio.sleep(0.01)

    async def health_check(self) -> bool:
        return self._model is not None
