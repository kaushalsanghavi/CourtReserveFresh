import { useState, useRef, useEffect, memo } from "react";
import { Textarea } from "@/components/ui/textarea";

interface IsolatedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  'data-testid'?: string;
}

// Memoized textarea component to prevent unnecessary re-renders
const IsolatedTextarea = memo(function IsolatedTextarea({ 
  value, 
  onChange, 
  placeholder, 
  rows = 2,
  className = "text-sm",
  'data-testid': testId 
}: IsolatedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Focus preservation - prevent re-render from affecting focused element
  useEffect(() => {
    if (textareaRef.current && document.activeElement === textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      // Restore cursor position after value change
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start, end);
        }
      });
    }
  }, [value]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      rows={rows}
      data-testid={testId}
      autoComplete="off"
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
    />
  );
});

export default IsolatedTextarea;