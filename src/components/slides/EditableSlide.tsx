import DOMPurify from 'dompurify';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EditableSlideProps {
  html: string;
  onUpdate: (newHtml: string) => void;
  disabled?: boolean;
}

// Elements that can be edited inline
const EDITABLE_SELECTORS = ['h1', 'h2', 'h3', 'p', 'li', 'span'];

export function EditableSlide({ html, onUpdate, disabled = false }: EditableSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const originalHtmlRef = useRef(html);

  // Update original HTML ref when prop changes (but not during editing)
  useEffect(() => {
    if (!isEditing) {
      originalHtmlRef.current = html;
    }
  }, [html, isEditing]);

  // Set up editable elements after render
  useEffect(() => {
    if (!containerRef.current || disabled) return;

    const container = containerRef.current;
    
    // Add data-editable to all text elements
    EDITABLE_SELECTORS.forEach(selector => {
      container.querySelectorAll(selector).forEach((el) => {
        el.setAttribute('data-editable', 'true');
      });
    });
  }, [html, disabled]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    const target = e.target as HTMLElement;
    if (target.hasAttribute('data-editable')) {
      target.contentEditable = 'true';
      target.focus();
      setIsEditing(true);
      
      // Select all text on focus
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [disabled]);

  const saveChanges = useCallback(() => {
    if (!containerRef.current) return;
    
    // Remove contentEditable from all elements
    containerRef.current.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute('contenteditable');
    });
    
    // Get the updated HTML from the section element (the slide wrapper)
    const slideSection = containerRef.current.querySelector('section');
    if (slideSection) {
      const newHtml = slideSection.outerHTML;
      if (newHtml !== originalHtmlRef.current) {
        onUpdate(newHtml);
        originalHtmlRef.current = newHtml;
      }
    }
    
    setIsEditing(false);
  }, [onUpdate]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute('data-editable')) {
      // Small delay to allow clicking between editable elements
      setTimeout(() => {
        if (!containerRef.current?.querySelector('[contenteditable="true"]:focus')) {
          saveChanges();
        }
      }, 100);
    }
  }, [saveChanges]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Cancel editing - restore original HTML
      if (containerRef.current) {
        containerRef.current.innerHTML = DOMPurify.sanitize(originalHtmlRef.current);
      }
      setIsEditing(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Save on Enter (Shift+Enter for new line in paragraphs)
      const target = e.target as HTMLElement;
      if (target.tagName !== 'P' && target.tagName !== 'LI') {
        e.preventDefault();
        saveChanges();
      }
    }
  }, [saveChanges]);

  return (
    <div
      ref={containerRef}
      className={`slide-content slide-editable h-full w-full ${disabled ? '' : 'cursor-default'}`}
      onClick={handleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html),
      }}
    />
  );
}
