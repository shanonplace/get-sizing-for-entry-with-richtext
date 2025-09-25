import dotenv from "dotenv";
import pkg from "contentful-management";
const { createClient } = pkg;

// Load environment variables
dotenv.config();

/**
 * Calculate the size in bytes of content (string or rich text JSON)
 * @param {string|object} content - The content to measure
 * @returns {number} Size in bytes
 */
function getByteSize(content) {
  if (!content) {
    return 0;
  }

  // If it's already a string, measure it directly
  if (typeof content === "string") {
    return Buffer.byteLength(content, "utf8");
  }

  // If it's an object (rich text JSON), stringify it first
  if (typeof content === "object") {
    const jsonString = JSON.stringify(content);
    return Buffer.byteLength(jsonString, "utf8");
  }

  return 0;
}

/**
 * Calculate the character count of content (string or rich text JSON)
 * @param {string|object} content - The content to measure
 * @returns {number} Character count
 */
function getCharacterCount(content) {
  if (!content) {
    return 0;
  }

  // If it's already a string, count characters directly
  if (typeof content === "string") {
    return content.length;
  }

  // If it's an object (rich text JSON), stringify it first
  if (typeof content === "object") {
    const jsonString = JSON.stringify(content);
    return jsonString.length;
  }

  return 0;
}

/**
 * Extract plain text content from rich text JSON structure
 * @param {object} richTextContent - Rich text JSON content
 * @returns {string} Plain text content
 */
function extractPlainTextFromRichText(richTextContent) {
  if (!richTextContent || typeof richTextContent !== "object") {
    return "";
  }

  let plainText = "";

  function traverse(node) {
    if (node.value) {
      plainText += node.value;
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  traverse(richTextContent);
  return plainText;
}

/**
 * Calculate JSON overhead vs actual content
 * @param {string|object} content - The content to analyze
 * @returns {object} Analysis with totalSize, contentSize, overheadSize, overheadPercentage
 */
function analyzeContentOverhead(content) {
  if (!content) {
    return {
      totalSize: 0,
      contentSize: 0,
      overheadSize: 0,
      overheadPercentage: 0,
    };
  }

  // If it's already a string, no overhead
  if (typeof content === "string") {
    const size = Buffer.byteLength(content, "utf8");
    return {
      totalSize: size,
      contentSize: size,
      overheadSize: 0,
      overheadPercentage: 0,
    };
  }

  // If it's rich text JSON, calculate overhead
  if (typeof content === "object") {
    const jsonString = JSON.stringify(content);
    const totalSize = Buffer.byteLength(jsonString, "utf8");

    const plainText = extractPlainTextFromRichText(content);
    const contentSize = Buffer.byteLength(plainText, "utf8");

    const overheadSize = totalSize - contentSize;
    const overheadPercentage =
      totalSize > 0 ? (overheadSize / totalSize) * 100 : 0;

    return {
      totalSize,
      contentSize,
      overheadSize,
      overheadPercentage: parseFloat(overheadPercentage.toFixed(1)),
    };
  }

  return {
    totalSize: 0,
    contentSize: 0,
    overheadSize: 0,
    overheadPercentage: 0,
  };
}

/**
 * Format bytes into human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0.00 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

/**
 * Format character count into human-readable format
 * @param {number} chars - Character count
 * @returns {string} Formatted character count string
 */
function formatCharacterCount(chars) {
  if (chars === 0) return "0 chars";

  if (chars < 1000) {
    return chars + " chars";
  } else if (chars < 1000000) {
    return (chars / 1000).toFixed(1) + "K chars";
  } else {
    return (chars / 1000000).toFixed(1) + "M chars";
  }
}

/**
 * Main function to retrieve entry and analyze content field sizes
 */
async function analyzeEntryContentSizes() {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      "CONTENTFUL_CMA_ACCESS_TOKEN",
      "CONTENTFUL_SPACE_ID",
      "CONTENTFUL_ENTRY_ID",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );
    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:");
      missingVars.forEach((varName) => console.error(`  - ${varName}`));
      console.error("");
      console.error(
        "Please copy .env.example to .env and fill in your values."
      );
      process.exit(1);
    }

    // Initialize Contentful Management client
    const client = createClient({
      accessToken: process.env.CONTENTFUL_CMA_ACCESS_TOKEN,
    });

    console.log("🔗 Connecting to Contentful...");

    // Get space
    const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
    console.log(`📦 Space: ${space.name}`);

    // Get environment
    const environment = await space.getEnvironment(
      process.env.CONTENTFUL_ENVIRONMENT_ID || "master"
    );
    console.log(`🌍 Environment: ${environment.sys.id}`);

    // Get all locales in the space
    console.log("🌐 Fetching locales...");
    const localesCollection = await environment.getLocales();
    const locales = localesCollection.items;
    console.log(`Found ${locales.length} locales in the space`);

    // Get the specific entry
    console.log("");
    console.log(`📄 Fetching entry: ${process.env.CONTENTFUL_ENTRY_ID}`);
    const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

    // Debug: Show all available fields
    console.log("🔍 Available fields in entry:", Object.keys(entry.fields));

    const contentFieldId = process.env.CONTENTFUL_CONTENT_FIELD_ID || "content";
    const contentField = entry.fields[contentFieldId];

    if (!contentField) {
      console.error(`❌ Content field '${contentFieldId}' not found in entry`);
      console.log("Available fields:", Object.keys(entry.fields));
      process.exit(1);
    }

    // Debug: Show the structure of the content field
    console.log(
      `🔍 Content field '${contentFieldId}' structure:`,
      Object.keys(contentField)
    );

    // Show a sample of the content for the first few locales
    const sampleLocales = locales.slice(0, 3);
    console.log("");
    console.log("🔍 Sample content for first 3 locales:");
    sampleLocales.forEach((locale) => {
      const content = contentField[locale.code];
      console.log(
        `  ${locale.code}: ${typeof content} - ${
          content
            ? JSON.stringify(content).substring(0, 100) + "..."
            : "null/undefined"
        }`
      );
    });

    console.log("");
    console.log(
      `📊 Analyzing content field '${contentFieldId}' sizes for each locale:`
    );
    console.log("");

    // Analyze content field for each locale
    const results = [];
    let totalSize = 0;
    let totalCharacters = 0;
    let totalContentSize = 0;
    let totalOverheadSize = 0;
    let localesWithContent = 0;

    // Sort locales alphabetically by code for consistent output
    const sortedLocales = locales.sort((a, b) => a.code.localeCompare(b.code));

    sortedLocales.forEach((locale) => {
      const localeCode = locale.code;
      const localeName = locale.name;
      const content = contentField[localeCode];
      const sizeInBytes = getByteSize(content);
      const characterCount = getCharacterCount(content);
      const overheadAnalysis = analyzeContentOverhead(content);
      const formattedSize = formatBytes(sizeInBytes);
      const formattedChars = formatCharacterCount(characterCount);

      results.push({
        localeCode,
        localeName,
        sizeInBytes,
        characterCount,
        formattedSize,
        formattedChars,
        overheadAnalysis,
        hasContent: !!content,
      });

      if (content) {
        totalSize += sizeInBytes;
        totalCharacters += characterCount;
        totalContentSize += overheadAnalysis.contentSize;
        totalOverheadSize += overheadAnalysis.overheadSize;
        localesWithContent++;
      }

      // Display result for this locale
      const statusIcon = content ? "✅" : "❌";
      const paddedCode = localeCode.padEnd(8);
      const paddedSize = formattedSize.padStart(12);
      const paddedChars = formattedChars.padStart(12);
      const overheadInfo =
        overheadAnalysis.overheadPercentage > 0
          ? `(${overheadAnalysis.overheadPercentage}% overhead)`.padStart(18)
          : "".padStart(18);

      console.log(
        `${statusIcon} ${paddedCode} | ${paddedSize} | ${paddedChars} | ${overheadInfo} | ${localeName}`
      );
    });

    // Calculate total entry size by getting the full JSON representation
    // This is how Contentful actually calculates entry size against the 2MB limit
    const fullEntryJson = JSON.stringify(entry);
    const totalEntrySize = Buffer.byteLength(fullEntryJson, "utf8");

    // Calculate 2MB limit percentage
    const twoMBInBytes = 2 * 1024 * 1024; // 2MB in bytes
    const entryUsagePercentage = (
      (totalEntrySize / twoMBInBytes) *
      100
    ).toFixed(2);

    // Summary statistics
    console.log("");
    console.log("=".repeat(70));
    console.log("📈 SUMMARY:");
    console.log(`   Total locales: ${locales.length}`);
    console.log(`   Locales with content: ${localesWithContent}`);
    console.log(
      `   Locales without content: ${locales.length - localesWithContent}`
    );
    console.log("");
    console.log("📊 SIZE BREAKDOWN:");
    console.log(
      `   Total RichText Content field size: ${formatBytes(
        totalSize
      )} (${formatCharacterCount(totalCharacters)})`
    );
    console.log(
      `   Total Entry size (all fields): ${formatBytes(totalEntrySize)}`
    );
    console.log("");
    console.log("📋 JSON OVERHEAD ANALYSIS:");
    const overallOverheadPercentage =
      totalSize > 0 ? ((totalOverheadSize / totalSize) * 100).toFixed(1) : 0;
    console.log(
      `   Actual text content: ${formatBytes(
        totalContentSize
      )} (${formatCharacterCount(totalContentSize)})`
    );
    console.log(
      `   JSON structure overhead: ${formatBytes(
        totalOverheadSize
      )} (${overallOverheadPercentage}%)`
    );
    console.log("");
    console.log("⚠️  CONTENTFUL LIMITS:");
    console.log(`   Entry size limit: ${formatBytes(twoMBInBytes)} (2MB)`);
    console.log(`   Current usage: ${entryUsagePercentage}%`);

    // Add warning if approaching limit
    if (totalEntrySize > twoMBInBytes * 0.8) {
      // 80% of limit
      console.log(
        `   🚨 WARNING: Entry is at ${entryUsagePercentage}% of the 2MB limit!`
      );
    } else if (totalEntrySize > twoMBInBytes * 0.6) {
      // 60% of limit
      console.log(
        `   ⚡ CAUTION: Entry is at ${entryUsagePercentage}% of the 2MB limit`
      );
    } else {
      console.log(`   ✅ Entry size is within safe limits`);
    }

    if (localesWithContent > 0) {
      console.log("");
      console.log("📏 CONTENT FIELD AVERAGES:");
      console.log(
        `   Average content size per locale: ${formatBytes(
          Math.round(totalSize / localesWithContent)
        )} (${formatCharacterCount(
          Math.round(totalCharacters / localesWithContent)
        )})`
      );
    }

    // Show field breakdown
    console.log("");
    console.log("📋 FIELD SIZE BREAKDOWN:");
    const fieldSizes = {};
    const allFields = Object.keys(entry.fields);

    allFields.forEach((fieldId) => {
      const field = entry.fields[fieldId];
      // Calculate field size as JSON (including all locales for this field)
      const fieldJson = JSON.stringify(field);
      const fieldTotal = Buffer.byteLength(fieldJson, "utf8");
      fieldSizes[fieldId] = fieldTotal;
    });

    // Sort fields by size (largest first)
    const sortedFields = Object.entries(fieldSizes).sort(
      ([, a], [, b]) => b - a
    );

    sortedFields.forEach(([fieldId, size]) => {
      const percentage = ((size / totalEntrySize) * 100).toFixed(1);
      console.log(
        `   ${fieldId.padEnd(20)} | ${formatBytes(size).padStart(
          12
        )} | ${percentage.padStart(5)}%`
      );
    });

    // Find largest and smallest content
    const withContent = results.filter((r) => r.hasContent);
    if (withContent.length > 0) {
      const largest = withContent.reduce((max, current) =>
        current.sizeInBytes > max.sizeInBytes ? current : max
      );
      const smallest = withContent.reduce((min, current) =>
        current.sizeInBytes < min.sizeInBytes ? current : min
      );

      console.log(
        `   Largest content: ${largest.localeCode} (${largest.formattedSize}, ${largest.formattedChars})`
      );
      console.log(
        `   Smallest content: ${smallest.localeCode} (${smallest.formattedSize}, ${smallest.formattedChars})`
      );
    }

    console.log("");
    console.log("✅ Analysis complete!");
  } catch (error) {
    console.error("❌ Error occurred:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    process.exit(1);
  }
}

// Run the analysis
analyzeEntryContentSizes();
