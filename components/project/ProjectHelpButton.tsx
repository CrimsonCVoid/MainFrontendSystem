"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorialSafe } from "@/hooks/use-tutorial";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectHelpButtonProps {
  className?: string;
}

export function ProjectHelpButton({ className }: ProjectHelpButtonProps) {
  const tutorialContext = useTutorialSafe();

  if (!tutorialContext) {
    return null;
  }

  const { openMenu, startTopic, isTopicCompleted, isTopicAvailable } = tutorialContext;

  const projectTopics = [
    { id: "project-page-overview", label: "Project Page Overview" },
    { id: "3d-viewer", label: "Using the 3D Viewer" },
    { id: "create-estimate", label: "Create an Estimate" },
    { id: "share-estimate", label: "Share with Clients" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 ${className}`}
        >
          <HelpCircle className="w-4 h-4" />
          Help
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Project Tutorials</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projectTopics.map((topic) => {
          const available = isTopicAvailable(topic.id);
          return (
            <DropdownMenuItem
              key={topic.id}
              onClick={() => available && startTopic(topic.id)}
              className={available ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}
              disabled={!available}
            >
              <span className="flex-1">{topic.label}</span>
              {isTopicCompleted(topic.id) && (
                <span className="text-xs text-emerald-600">Done</span>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openMenu()} className="cursor-pointer">
          <span className="text-blue-600">View All Tutorials</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
