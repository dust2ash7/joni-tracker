import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { previewPathRewrite } from "@/lib/preview-path-prefix";
import { routeTree } from "./routeTree.gen";

function routerBasepath(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/") return undefined;
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: routerBasepath(),
    rewrite: previewPathRewrite(),
    defaultErrorComponent: AppErrorComponent,
  });
}
