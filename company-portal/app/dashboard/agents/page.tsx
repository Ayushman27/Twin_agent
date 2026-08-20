import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AgentsDashboard() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Agent Groups (Employee Specific)</h1>
        <Button>Generate New Group</Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Software Engineering Agent Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Task Agent</Badge>
                <Badge variant="outline">Coding Agent</Badge>
                <Badge variant="outline">Testing Agent</Badge>
                <Badge variant="outline">GitHub Agent</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Role: SDE-I | Assigned: Employee A
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">View Executions</Button>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
