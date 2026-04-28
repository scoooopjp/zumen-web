import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * locale-aware な Link / redirect / useRouter / usePathname。
 * 利用側は `@/i18n/navigation` から import する。
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
