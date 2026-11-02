import { createFileRoute } from "@tanstack/react-router";
import { JoniApp } from "@/components/joni/app";

export const Route = createFileRoute("/")({ component: JoniApp });
