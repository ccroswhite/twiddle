import type { NodeDefinition } from '@twiddle/shared';

export const HtmlExtractNode: NodeDefinition = {
  type: 'twiddle.htmlExtract',
  displayName: 'HTML Extract',
  description: 'Extract data from HTML content using CSS selectors or XPath',
  icon: 'code',
  iconColor: '#e34c26',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'sourceType',
      displayName: 'Source',
      type: 'options',
      default: 'url',
      options: [
        { name: 'URL', value: 'url', description: 'Fetch HTML from a URL' },
        { name: 'HTML String', value: 'html', description: 'Use HTML from input data or string' },
        { name: 'Binary Data', value: 'binary', description: 'Use HTML from binary input' },
      ],
      description: 'Where to get the HTML content from',
    },
    // URL Source
    {
      name: 'url',
      displayName: 'URL',
      type: 'string',
      default: '',
      placeholder: 'https://example.com/page',
      description: 'URL to fetch HTML from',
      displayOptions: {
        show: {
          sourceType: ['url'],
        },
      },
      required: true,
    },
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Basic Auth', value: 'basicAuth' },
        { name: 'Bearer Token', value: 'bearerToken' },
        { name: 'Custom Headers', value: 'customHeaders' },
      ],
      description: 'Authentication method for the URL',
      displayOptions: {
        show: {
          sourceType: ['url'],
        },
      },
    },
    {
      name: 'requestHeaders',
      displayName: 'Request Headers',
      type: 'fixedCollection',
      default: {},
      description: 'Headers to send with the request',
      displayOptions: {
        show: {
          sourceType: ['url'],
        },
      },
      typeOptions: {
        multipleValues: true,
      },
    },
    // HTML String Source
    {
      name: 'htmlContent',
      displayName: 'HTML Content',
      type: 'string',
      default: '',
      placeholder: '<html><body>...</body></html>',
      description: 'HTML string to parse',
      displayOptions: {
        show: {
          sourceType: ['html'],
        },
      },
      typeOptions: {
        rows: 10,
      },
    },
    // Binary Source
    {
      name: 'binaryPropertyName',
      displayName: 'Binary Property',
      type: 'string',
      default: 'data',
      description: 'Name of the binary property containing the HTML',
      displayOptions: {
        show: {
          sourceType: ['binary'],
        },
      },
    },
    // Extraction Mode
    {
      name: 'extractionMode',
      displayName: 'Extraction Mode',
      type: 'options',
      default: 'css',
      options: [
        { name: 'CSS Selector', value: 'css', description: 'Use CSS selectors to extract data' },
        { name: 'XPath', value: 'xpath', description: 'Use XPath expressions to extract data' },
        { name: 'JSON-LD', value: 'jsonld', description: 'Extract JSON-LD structured data' },
        { name: 'Meta Tags', value: 'meta', description: 'Extract meta tag information' },
        { name: 'Links', value: 'links', description: 'Extract all links from the page' },
        { name: 'Images', value: 'images', description: 'Extract all images from the page' },
        { name: 'Tables', value: 'tables', description: 'Extract table data' },
      ],
      description: 'Method to use for extracting data',
    },
    // CSS Selector Options
    {
      name: 'cssSelector',
      displayName: 'CSS Selector',
      type: 'string',
      default: '',
      placeholder: 'div.content > p, #main-title, .product-price',
      description: 'CSS selector to match elements',
      displayOptions: {
        show: {
          extractionMode: ['css'],
        },
      },
      required: true,
    },
    {
      name: 'cssReturnValue',
      displayName: 'Return Value',
      type: 'options',
      default: 'text',
      options: [
        { name: 'Text Content', value: 'text', description: 'Get the text content of matched elements' },
        { name: 'HTML', value: 'html', description: 'Get the inner HTML of matched elements' },
        { name: 'Outer HTML', value: 'outerHtml', description: 'Get the outer HTML including the element itself' },
        { name: 'Attribute', value: 'attribute', description: 'Get a specific attribute value' },
        { name: 'All Attributes', value: 'allAttributes', description: 'Get all attributes as an object' },
      ],
      description: 'What to return from matched elements',
      displayOptions: {
        show: {
          extractionMode: ['css'],
        },
      },
    },
    {
      name: 'attributeName',
      displayName: 'Attribute Name',
      type: 'string',
      default: 'href',
      placeholder: 'href, src, data-id',
      description: 'Name of the attribute to extract',
      displayOptions: {
        show: {
          extractionMode: ['css'],
          cssReturnValue: ['attribute'],
        },
      },
    },
    // XPath Options
    {
      name: 'xpathExpression',
      displayName: 'XPath Expression',
      type: 'string',
      default: '',
      placeholder: '//div[@class="content"]/p | //h1[@id="title"]',
      description: 'XPath expression to match elements',
      displayOptions: {
        show: {
          extractionMode: ['xpath'],
        },
      },
      required: true,
    },
    {
      name: 'xpathReturnValue',
      displayName: 'Return Value',
      type: 'options',
      default: 'text',
      options: [
        { name: 'Text Content', value: 'text', description: 'Get the text content' },
        { name: 'HTML', value: 'html', description: 'Get the inner HTML' },
        { name: 'Attribute', value: 'attribute', description: 'Get attribute value (use @attr in XPath)' },
      ],
      description: 'What to return from matched elements',
      displayOptions: {
        show: {
          extractionMode: ['xpath'],
        },
      },
    },
    // Multiple Extractions
    {
      name: 'extractions',
      displayName: 'Extractions',
      type: 'fixedCollection',
      default: {},
      description: 'Define multiple extraction rules',
      typeOptions: {
        multipleValues: true,
      },
    },
    // Table Options
    {
      name: 'tableSelector',
      displayName: 'Table Selector',
      type: 'string',
      default: 'table',
      placeholder: 'table.data-table, #results-table',
      description: 'CSS selector for the table(s) to extract',
      displayOptions: {
        show: {
          extractionMode: ['tables'],
        },
      },
    },
    {
      name: 'tableOptions',
      displayName: 'Table Options',
      type: 'options',
      default: 'auto',
      options: [
        { name: 'Auto-detect Headers', value: 'auto', description: 'Automatically detect header row' },
        { name: 'First Row as Headers', value: 'firstRow', description: 'Use first row as column headers' },
        { name: 'No Headers', value: 'noHeaders', description: 'Return data without headers' },
        { name: 'Custom Headers', value: 'custom', description: 'Specify custom column headers' },
      ],
      description: 'How to handle table headers',
      displayOptions: {
        show: {
          extractionMode: ['tables'],
        },
      },
    },
    {
      name: 'customHeaders',
      displayName: 'Custom Headers',
      type: 'string',
      default: '',
      placeholder: 'Name, Price, Quantity',
      description: 'Comma-separated list of column headers',
      displayOptions: {
        show: {
          extractionMode: ['tables'],
          tableOptions: ['custom'],
        },
      },
    },
    // Link Options
    {
      name: 'linkFilter',
      displayName: 'Link Filter',
      type: 'string',
      default: '',
      placeholder: 'https://example.com/*',
      description: 'Filter links by URL pattern (supports wildcards)',
      displayOptions: {
        show: {
          extractionMode: ['links'],
        },
      },
    },
    {
      name: 'linkIncludeText',
      displayName: 'Include Link Text',
      type: 'boolean',
      default: true,
      description: 'Include the link text in the output',
      displayOptions: {
        show: {
          extractionMode: ['links'],
        },
      },
    },
    // Image Options
    {
      name: 'imageIncludeAlt',
      displayName: 'Include Alt Text',
      type: 'boolean',
      default: true,
      description: 'Include alt text in the output',
      displayOptions: {
        show: {
          extractionMode: ['images'],
        },
      },
    },
    {
      name: 'imageIncludeDimensions',
      displayName: 'Include Dimensions',
      type: 'boolean',
      default: false,
      description: 'Include width and height attributes',
      displayOptions: {
        show: {
          extractionMode: ['images'],
        },
      },
    },
    // Meta Tag Options
    {
      name: 'metaTagTypes',
      displayName: 'Meta Tag Types',
      type: 'multiOptions',
      default: ['title', 'description', 'ogTags'],
      options: [
        { name: 'Title', value: 'title' },
        { name: 'Description', value: 'description' },
        { name: 'Keywords', value: 'keywords' },
        { name: 'Open Graph Tags', value: 'ogTags' },
        { name: 'Twitter Cards', value: 'twitterCards' },
        { name: 'Canonical URL', value: 'canonical' },
        { name: 'Robots', value: 'robots' },
        { name: 'All Meta Tags', value: 'all' },
      ],
      description: 'Which meta tags to extract',
      displayOptions: {
        show: {
          extractionMode: ['meta'],
        },
      },
    },
    // Output Options
    {
      name: 'returnArray',
      displayName: 'Return as Array',
      type: 'boolean',
      default: true,
      description: 'Return all matches as an array (false = return first match only)',
      displayOptions: {
        show: {
          extractionMode: ['css', 'xpath'],
        },
      },
    },
    {
      name: 'trimWhitespace',
      displayName: 'Trim Whitespace',
      type: 'boolean',
      default: true,
      description: 'Remove leading and trailing whitespace from extracted text',
    },
    {
      name: 'outputField',
      displayName: 'Output Field',
      type: 'string',
      default: 'extracted',
      description: 'Name of the field to store extracted data',
    },
    {
      name: 'includeSourceHtml',
      displayName: 'Include Source HTML',
      type: 'boolean',
      default: false,
      description: 'Include the original HTML in the output',
    },
    // Error Handling
    {
      name: 'continueOnFail',
      displayName: 'Continue on Fail',
      type: 'boolean',
      default: false,
      description: 'Continue execution even if extraction fails',
    },
    {
      name: 'emptyResultHandling',
      displayName: 'Empty Result Handling',
      type: 'options',
      default: 'empty',
      options: [
        { name: 'Return Empty', value: 'empty', description: 'Return empty array/null' },
        { name: 'Throw Error', value: 'error', description: 'Throw an error if no matches found' },
        { name: 'Return Default', value: 'default', description: 'Return a default value' },
      ],
      description: 'What to do when no elements match',
    },
    {
      name: 'defaultValue',
      displayName: 'Default Value',
      type: 'string',
      default: '',
      description: 'Default value to return when no matches found',
      displayOptions: {
        show: {
          emptyResultHandling: ['default'],
        },
      },
    },
    // Request Options (for URL source)
    {
      name: 'timeout',
      displayName: 'Timeout (seconds)',
      type: 'number',
      default: 30,
      description: 'Request timeout in seconds',
      displayOptions: {
        show: {
          sourceType: ['url'],
        },
      },
    },
    {
      name: 'followRedirects',
      displayName: 'Follow Redirects',
      type: 'boolean',
      default: true,
      description: 'Follow HTTP redirects',
      displayOptions: {
        show: {
          sourceType: ['url'],
        },
      },
    },
    {
      name: 'userAgent',
      displayName: 'User Agent',
      type: 'string',
      default: '',
      placeholder: 'Mozilla/5.0 (compatible; TwiddleBot/1.0)',
      description: 'Custom User-Agent header (leave empty for default)',
      displayOptions: {
        show: {
          sourceType: ['url'],
        },
      },
    },
  ],
  credentials: [
    {
      name: 'httpBasicAuth',
      displayOptions: {
        show: {
          sourceType: ['url'],
          authentication: ['basicAuth'],
        },
      },
    },
    {
      name: 'httpBearerToken',
      displayOptions: {
        show: {
          sourceType: ['url'],
          authentication: ['bearerToken'],
        },
      },
    },
  ],
  subtitle: '={{$parameter["extractionMode"]}} from {{$parameter["sourceType"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/html-extract',
};
