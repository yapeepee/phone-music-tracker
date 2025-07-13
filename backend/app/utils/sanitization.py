"""Sanitization utilities for user-generated content."""
from typing import List, Optional
import re
import html


def sanitize_markdown(content: str, allow_images: bool = True) -> str:
    """
    Sanitize markdown content to prevent XSS attacks.
    
    Args:
        content: Raw markdown content from user
        allow_images: Whether to allow image tags (default True)
        
    Returns:
        Sanitized markdown content safe for storage
    """
    if not content:
        return ""
    
    # Remove script tags and other dangerous HTML
    # This is a basic implementation until bleach is installed
    dangerous_patterns = [
        # Script tags
        r'<script[^>]*>.*?</script>',
        # Style tags
        r'<style[^>]*>.*?</style>',
        # Event handlers
        r'on\w+\s*=\s*["\'][^"\']*["\']',
        r'on\w+\s*=\s*[^\s>]+',
        # JavaScript protocol
        r'javascript:',
        r'vbscript:',
        # Data URLs with scripts
        r'data:[^,]*script',
        # Meta refresh
        r'<meta[^>]*http-equiv[^>]*refresh[^>]*>',
        # Object/embed tags
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>',
        # Form tags
        r'<form[^>]*>.*?</form>',
        # Iframe
        r'<iframe[^>]*>.*?</iframe>',
    ]
    
    cleaned_content = content
    for pattern in dangerous_patterns:
        cleaned_content = re.sub(pattern, '', cleaned_content, flags=re.IGNORECASE | re.DOTALL)
    
    # HTML encode any remaining HTML tags
    # This converts < to &lt; and > to &gt;
    cleaned_content = html.escape(cleaned_content)
    
    # But we want to allow some markdown formatting
    # So we'll unescape certain safe patterns
    
    # Allow markdown links: [text](url)
    cleaned_content = re.sub(
        r'\\\[([^\]]+)\\\]\\\(([^)]+)\\\)',
        r'[\1](\2)',
        cleaned_content
    )
    
    # Allow markdown emphasis: *text* or _text_
    cleaned_content = re.sub(r'\\\*([^*]+)\\\*', r'*\1*', cleaned_content)
    cleaned_content = re.sub(r'\\_([^_]+)\\_', r'_\1_', cleaned_content)
    
    # Allow markdown bold: **text** or __text__
    cleaned_content = re.sub(r'\\\*\\\*([^*]+)\\\*\\\*', r'**\1**', cleaned_content)
    cleaned_content = re.sub(r'\\\_\\\_([^_]+)\\\_\\\_', r'__\1__', cleaned_content)
    
    # Allow code blocks: `code` or ```code```
    cleaned_content = re.sub(r'\\`([^`]+)\\`', r'`\1`', cleaned_content)
    cleaned_content = re.sub(r'\\`\\`\\`([^`]+)\\`\\`\\`', r'```\1```', cleaned_content, flags=re.DOTALL)
    
    # Allow blockquotes: > text
    cleaned_content = re.sub(r'^\\&gt;', '>', cleaned_content, flags=re.MULTILINE)
    
    # Allow headers: # text
    cleaned_content = re.sub(r'^\\#', '#', cleaned_content, flags=re.MULTILINE)
    
    # Allow lists: - text or * text or 1. text
    cleaned_content = re.sub(r'^\\-', '-', cleaned_content, flags=re.MULTILINE)
    cleaned_content = re.sub(r'^\\\*', '*', cleaned_content, flags=re.MULTILINE)
    cleaned_content = re.sub(r'^(\d+)\\\\.', r'\1.', cleaned_content, flags=re.MULTILINE)
    
    # If images are allowed, unescape image syntax: ![alt](url)
    if allow_images:
        cleaned_content = re.sub(
            r'\\!\\\[([^\]]+)\\\]\\\(([^)]+)\\\)',
            r'![\1](\2)',
            cleaned_content
        )
    
    return cleaned_content


def clean_filename(filename: str) -> str:
    """
    Clean a filename to prevent directory traversal attacks.
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    if not filename:
        return ""
    
    # Remove any path components
    import os
    filename = os.path.basename(filename)
    
    # Remove potentially dangerous characters
    dangerous_chars = ['..', '/', '\\', '\x00']
    for char in dangerous_chars:
        filename = filename.replace(char, '')
    
    # Limit length
    name, ext = os.path.splitext(filename)
    if len(name) > 100:
        name = name[:100]
    
    return name + ext


def truncate_text(text: str, max_length: int = 200, suffix: str = "...") -> str:
    """
    Safely truncate text without breaking words.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: String to append when truncated
        
    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text
    
    # Find the last space before max_length
    truncated = text[:max_length]
    last_space = truncated.rfind(' ')
    
    if last_space > 0:
        truncated = truncated[:last_space]
    
    return truncated + suffix