# 📝 PromptDefault — System Prompts Management

## Overview
Folder ini berisi semua **system prompts** dan **persona prompts** yang digunakan di Necrosis AI. Sebelumnya semua prompt dicampur aduk di `script.js` dan `script_fixes.js`. Sekarang sudah terpisah rapi di folder ini.

## File Structure

```
PromptDefault/
├── system-prompts.js      # Semua system prompts (Hardcore, Professional, Creative, dll)
├── persona-prompts.js     # Persona untuk berbagai role (Programmer, Researcher, Artist, dll)
├── README.md              # File ini
└── (file tambahan untuk prompts lain)
```

## Files Description

### 1️⃣ system-prompts.js
Contains all core system prompts:
- **HARDCORE** - Unrestricted AI mode
- **PROFESSIONAL** - Standard professional assistant
- **CREATIVE** - Specialized in creative writing
- **TECHNICAL** - Programming and tech expert
- **ACADEMIC** - Educational tutor
- **BUSINESS** - Business consultant
- **TRANSLATOR** - Translation specialist
- **TTS** - Text-to-Speech guidelines
- **VOICE_INPUT** - Voice command processing
- **CODE_GENERATOR** - Code generation expert
- **IMAGE_GENERATOR** - Image generation specialist
- **SUMMARIZER** - Content summarization
- **WEB_SEARCH** - Web search assistant

### 2️⃣ persona-prompts.js
Contains personality presets for different roles:
- **PROGRAMMER** - Software engineer persona
- **RESEARCHER** - Academic researcher persona
- **BUSINESS_STRATEGIST** - Corporate strategist
- **ARTIST** - Creative artist persona
- **JOURNALIST** - News reporter persona
- **CHEF** - Professional chef persona
- **COUNSELOR** - Mental health counselor
- **TEACHER** - Educator/instructor
- **ENTREPRENEUR** - Startup founder
- **DOCTOR** - Medical professional

## How to Use

### In Browser (index.html)
```html
<script src="PromptDefault/system-prompts.js"></script>
<script src="PromptDefault/persona-prompts.js"></script>
```

### In Node.js (server.js)
```javascript
const { SYSTEM_PROMPTS } = require('./PromptDefault/system-prompts.js');
const { PERSONA_PROMPTS } = require('./PromptDefault/persona-prompts.js');
```

### Accessing Prompts in Code
```javascript
// Get system prompt
const hardcorePrompt = SYSTEM_PROMPTS.HARDCORE.content;
const professionalPrompt = SYSTEM_PROMPTS.PROFESSIONAL.content;

// Get persona prompt
const programmerPersona = PERSONA_PROMPTS.PROGRAMMER.content;
const artistPersona = PERSONA_PROMPTS.ARTIST.content;
```

## Adding New Prompts

To add a new system prompt:
```javascript
NEW_PROMPT: {
  id: 'unique_id',
  name: 'Display Name',
  description: 'Brief description',
  content: 'Actual prompt content here...'
}
```

## Benefits of This Structure

✅ **Organized** - All prompts in one place, easy to find
✅ **Maintainable** - Changes to prompts don't affect script logic
✅ **Reusable** - Easy to import and use in different contexts
✅ **Scalable** - Easy to add more prompts without cluttering main files
✅ **Readable** - Clear separation of concerns
✅ **Portable** - Can be used across different projects

## Migration Notes

This structure replaces the old system where prompts were:
- ❌ Scattered throughout script.js
- ❌ Mixed with UI logic in script_fixes.js
- ❌ Hard to maintain and update
- ❌ Difficult to reuse

Now they are:
- ✅ Centralized in PromptDefault/
- ✅ Separated from UI and logic
- ✅ Easy to manage and update
- ✅ Easily reusable across the application

## Future Additions

Potential additions to this folder:
- `command-prompts.js` - For voice commands and shortcuts
- `custom-prompts.js` - User-defined custom prompts
- `api-prompts.js` - Prompts for API integration
- `plugin-prompts.js` - Plugin-specific prompts

---

**Last Updated**: 2026-04-10
**Version**: 2.0
