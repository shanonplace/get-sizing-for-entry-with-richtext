# Get Entry Size for Each Locale

A Node.js script that uses the Contentful Content Management API to retrieve a specific entry and analyze the size in bytes of content fields across all locales in a space.

**Note: This is not an official Contentful tool and is provided as-is.**

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:

   ```env
   CONTENTFUL_CMA_ACCESS_TOKEN=your_token
   CONTENTFUL_SPACE_ID=your_space_id
   CONTENTFUL_ENTRY_ID=your_entry_id
   CONTENTFUL_ENVIRONMENT_ID=master
   CONTENTFUL_CONTENT_FIELD_ID=content
   ```

3. Run the script:
   ```bash
   npm start
   ```

## Sample Output

```
📊 Analyzing content field 'content' sizes for each locale:

✅ ar-AE    |    23.94 KB |     12.3K chars |     (65.2% overhead) | Arabic (UAE)
✅ ar-EG    |    23.94 KB |     12.3K chars |     (65.2% overhead) | Arabic (Egypt)
✅ en-US    |    24.12 KB |     12.5K chars |     (64.8% overhead) | English (United States)
✅ es-ES    |    24.85 KB |     12.8K chars |     (66.1% overhead) | Spanish (Spain)
❌ fr-FR    |     0.00 B  |        0 chars |                      | French (France)
...

======================================================================
📈 SUMMARY:
   Total locales: 89
   Locales with content: 67
   Locales without content: 22

📊 SIZE BREAKDOWN:
   Total RichText Content field size: 1.61 MB (832.5K chars)
   Total Entry size (all fields): 1.72 MB

📋 JSON OVERHEAD ANALYSIS:
   Actual text content: 560.3 KB (287.2K chars)
   JSON structure overhead: 1.07 MB (65.2%)

⚠️  CONTENTFUL LIMITS:
   Entry size limit: 2.00 MB (2MB)
   Current usage: 86.15%
   ⚡ CAUTION: Entry is at 86.15% of the 2MB limit
```

The tool will display content field sizes for each locale and calculate total entry size against Contentful's 2MB limit.
