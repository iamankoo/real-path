'use client';

import { useEffect } from "react";

export default function AuthReset({ isAuth }: { isAuth: boolean }) {
  useEffect(() => {
    if (!isAuth) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.error("Unauthenticated storage reset failed.", error);
      }
    }
  }, [isAuth]);

  return null;
}