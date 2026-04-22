import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../backend/api/src/trpc/router";

export const trpc = createTRPCReact<AppRouter>();

export const getBaseUrl = () => {
  let url = "http://127.0.0.1:8787";
  if (process.env.NEXT_PUBLIC_API_URL) {
    url = process.env.NEXT_PUBLIC_API_URL;
  }
  console.log(`[TRPC] Using API URL: ${url}`);
  return url;
};
