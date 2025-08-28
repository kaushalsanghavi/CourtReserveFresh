import { useRef, useEffect } from "react";

interface IsolatedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  'data-testid'?: string;
}

// Raw DOM textarea to completely bypass React's re-render cycle
export default function IsolatedTextarea({ 
  value, 
  onChange, 
  placeholder, 
  rows = 2,
  className = "text-sm",
  'data-testid': testId 
}: IsolatedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastValueRef = useRef(value);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Only update DOM value if it's different and textarea is not focused
    if (value !== lastValueRef.current && document.activeElement !== textarea) {
      textarea.value = value;
      lastValueRef.current = value;
    }

    const handleInput = (e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      lastValueRef.current = target.value;
      onChange(target.value);
    };

    textarea.addEventListener('input', handleInput);
    return () => textarea.removeEventListener('input', handleInput);
  }, [value, onChange]);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={value}
      placeholder={placeholder}
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      rows={rows}
      data-testid={testId}
      autoComplete="off"
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
    />
  );
}