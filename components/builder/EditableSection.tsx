"use client";

import {
  type ComponentPropsWithoutRef,
  type ElementType,
  useEffect,
  useRef,
  useState,
} from "react";

import { hasMeaningfulText } from "@/lib/resume";

type EditableSectionProps<T extends ElementType> = {
  as?: T;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  className?: string;
  multiline?: boolean;
  debounceMs?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "onInput" | "onBlur">;

export default function EditableSection<T extends ElementType = "div">({
  as,
  value,
  placeholder,
  onSave,
  className,
  multiline = false,
  debounceMs = 320,
  ...props
}: EditableSectionProps<T>) {
  const Tag = (as || "div") as ElementType;
  const contentRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!contentRef.current || focused) {
      return;
    }

    const displayValue = hasMeaningfulText(value) ? value : placeholder;
    contentRef.current.textContent = displayValue;
  }, [focused, placeholder, value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const queueSave = (nextValue: string) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      const sanitized = nextValue.replace(/\u00A0/g, " ").trim();
      onSaveRef.current(sanitized);
    }, debounceMs);
  };

  return (
    <Tag
      {...props}
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => {
        setFocused(true);

        if (!hasMeaningfulText(value) && contentRef.current) {
          contentRef.current.textContent = "";
        }
      }}
      onInput={(event: React.FormEvent<HTMLElement>) => {
        const nextValue = multiline
          ? event.currentTarget.innerText
          : event.currentTarget.innerText.replace(/\n/g, " ");

        queueSave(nextValue);
      }}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        setFocused(false);

        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }

        const nextValue = multiline
          ? event.currentTarget.innerText
          : event.currentTarget.innerText.replace(/\n/g, " ");

        const sanitized = nextValue.replace(/\u00A0/g, " ").trim();
        onSaveRef.current(sanitized);

        if (!hasMeaningfulText(nextValue) && contentRef.current) {
          contentRef.current.textContent = placeholder;
        }
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={[
        "outline-none transition",
        !focused && !hasMeaningfulText(value) ? "text-slate-400" : "",
        focused
          ? "rounded-md ring-2 ring-indigo-200 ring-offset-2 ring-offset-white"
          : "",
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
