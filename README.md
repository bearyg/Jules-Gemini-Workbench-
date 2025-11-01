# Jules Gemini Function Workbench

**A powerful browser-based workbench to test, debug, and iterate on your server-side JavaScript functions that interact with the Google Gemini API.**

---

## What is the Gemini Function Workbench?

Developing functions that call the Gemini API often involves a slow feedback loop: you write your code, deploy it to a server environment, send a request, and check the logs. This process is cumbersome, especially when fine-tuning complex prompts or chaining AI calls.

The Jules Gemini Function Workbench solves this problem by creating a sophisticated, sandboxed browser environment that can directly execute your Node.js service files. It intelligently **auto-patches** server-side code, mocks necessary dependencies, and provides a rich UI for interacting with your functions and viewing their output in real-time.

This tool allows you to achieve a tight, rapid iteration cycle for prompt engineering and function development without ever leaving your browser.

## Key Features

-   **Load Local Service Files**: Directly load your `.js` or `.ts` files from your local machine.
-   **Intelligent Auto-Patcher**:
    -   Uses the Gemini API itself to analyze and rewrite your code to be browser-compatible.
    -   Automatically modernizes deprecated Gemini SDK usage (e.g., `result.response.text()` becomes `result.text`).
    -   Adapts server-side API key retrieval (e.g., using `@google-cloud/secret-manager`) to work within the workbench.
-   **Function Discovery**: Automatically parses your file to find all exported functions (supports both CommonJS and ES Modules) and lists them in a dropdown.
-   **Prompt Extraction & AI-Powered Improvement**:
    -   Scans your code to find large template literals, assuming they are Gemini prompts.
    -   Displays prompts in a dedicated editor where you can make changes.
    -   **"Consult Expert"**: A one-click feature that uses Gemini to analyze and rewrite your prompt for better clarity, effectiveness, and reliability. It also suggests the required `tools` (like `googleSearch` or `googleMaps`) for the improved prompt.
-   **Argument Scaffolding**: Let the AI generate a boilerplate JSON object with the expected argument structure for any selected function.
-   **Secure Sandboxed Execution**:
    -   Runs your code in a completely isolated environment within the browser.
    -   Mocks Node.js dependencies like `@google-cloud/secret-manager`.
    -   Intercepts calls to `process.env` to provide a secure API key context.
-   **Detailed Response Viewer**:
    -   View the raw return value of your function.
    -   For grounded responses, it automatically extracts and lists clickable source links.
    -   Features a specialized UI for image inventory analysis, overlaying interactive bounding boxes on the input image.
-   **Live Execution Logs**: See all `console.log` statements and detailed logs of every Gemini API call made by your function, including the request and response objects.
-   **Export Updated Code**: Download the auto-patched version of your file, which includes any prompt changes you've permanently saved.

## How to Use the Workbench

The workflow is designed to be simple and intuitive.

1.  **Load Your File**: Click the **"Load Service File"** button in the header and select the `.js` or `.ts` file from your project that contains the functions you want to test. The workbench will analyze and potentially patch the file.
2.  **Select a Function**: Once loaded, a dropdown will be populated with all the functions exported from your file. Choose the one you want to execute.
3.  **Provide Arguments**:
    -   In the "Runner" tab, enter the arguments for your function in the **Arguments (JSON)** text area.
    -   Alternatively, click **"Scaffold Arguments"** to have Gemini generate a template for you to fill in.
4.  **Attach a File (Optional)**: If your function is designed to process a file (e.g., an image), click the upload area to attach it.
5.  **Inspect & Refine (Optional)**:
    -   **Code Tab**: View a side-by-side diff of your original code and the "Live" executable code after auto-patching.
    -   **Prompts Tab**: If your function contains large string literals, they'll appear here. You can edit them directly. Click **"Consult Expert"** for AI-powered improvements, then **"Save Changes"** to bake them into the live code.
6.  **Execute**: Click the **"Execute Function"** button.
7.  **Review Results**:
    -   The **Response** panel on the right will show the function's return value or any errors that occurred.
    -   Switch to the **Execution Logs** tab to see a detailed trace of the execution, including any `console.log` output and API call details.

## Technical Overview

The workbench is a static single-page application built with **React and TypeScript**, styled with **TailwindCSS**. It runs entirely in the browser with no server backend or build step, leveraging browser `importmap`s to load dependencies from a CDN.

#### Sandboxing

The core of the workbench is its sandboxed execution environment. It avoids using a dangerous direct `eval()` and instead constructs a safe context for your code:

-   **CommonJS Modules**: It uses the `new Function()` constructor to create a function that is passed a custom-built, sandboxed scope. This scope includes polyfills for `module`, `exports`, and a custom `require` function.
-   **`require` Polyfill**: The custom `require` function intercepts module requests.
    -   `@google/genai` is proxied to inject logging around API calls.
    -   `@google-cloud/secret-manager` is replaced with a mock that safely resolves the API key from the host environment.
-   **`process.env` Proxy**: Your code's access to `process.env` is trapped by a `Proxy` object. It safely provides the `API_KEY` and mocks `BROWSER_ENV` while warning about any other unexpected environment variable access.
