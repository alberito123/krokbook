# Implementation Plan: KrokBook

## Overview

This implementation plan breaks down the KrokBook medical exam preparation application into discrete, incremental coding tasks. The approach follows a bottom-up strategy: starting with the database schema and data layer, then building core parsing and business logic, followed by UI components, and finally integration and testing. Each task builds on previous work to ensure no orphaned code.

## Tasks

- [x] 1. Set up project structure and database schema
  - Initialize Next.js 14 project with TypeScript, Tailwind CSS, and Shadcn UI
  - Configure Supabase client and environment variables
  - Create database migration files for all tables (folders, questions, notebook_pages, user_errors)
  - Set up Supabase types generation for TypeScript
  - _Requirements: 11.1, 11.2, 12.1_

- [ ] 2. Implement database access layer
  - [x] 2.1 Create server actions for folder operations
    - Implement `getFolders()`, `createFolder(name)`
    - Add error handling and validation
    - _Requirements: 1.1, 2.6_
  
  - [x] 2.2 Create server actions for question operations
    - Implement `getQuestionsByFolder(folderId)`, `uploadQuestions(folderId, questions)`
    - Implement `getRandomQuestions(count)` for mock exams
    - Add transaction support for batch uploads
    - _Requirements: 1.2, 2.4, 9.1_
  
  - [x] 2.3 Create server actions for notebook operations
    - Implement `getNotebookContent(folderId)`, `saveNotebookContent(folderId, content)`
    - Add debounced save logic
    - _Requirements: 1.3, 6.3_
  
  - [x] 2.4 Create server actions for error tracking
    - Implement `createUserError(questionId, selectedIndex)`, `getUserErrors()`
    - Implement `getErrorsByFolder(folderId)`, `updateErrorExplanation(errorId, explanation)`
    - _Requirements: 3.3, 7.1, 7.5_

- [ ] 3. Implement question parser and validation
  - [x] 3.1 Create parser module
    - Write `parseRawText(text)` function to extract questions from raw text
    - Implement parsing logic for question text, answer options, and correct answer
    - Return array of `ParsedQuestion` objects
    - _Requirements: 2.2_
  
  - [x] 3.2 Write property test for parser
    - **Property 2: Parser Produces Valid Question Objects**
    - **Validates: Requirements 2.2**
  
  - [x] 3.3 Create validation module
    - Write validation functions for minimum options (2), maximum options (10)
    - Write validation for exactly one correct answer
    - Write validation for required fields
    - _Requirements: 12.2, 12.3, 12.4_
  
  - [x] 3.4 Write property tests for validation
    - **Property 4: Invalid Input Produces Error Messages**
    - **Property 24: Parser Validates Minimum Options**
    - **Property 25: Parser Validates Single Correct Answer**
    - **Property 26: Parser Validates Option Count Bounds**
    - **Validates: Requirements 2.5, 12.2, 12.3, 12.4**
  
  - [x] 3.5 Write unit tests for parser edge cases
    - Test special characters, Unicode, very long text
    - Test malformed inputs (missing question mark, duplicate options)
    - _Requirements: 2.2, 2.5_
  
  - [x] 3.6 Extend parser for Ukrainian language support
    - Add support for Cyrillic answer labels (А, Б, В, Г, Д, Е, Є, Ж, З, И)
    - Update answer option regex to match both Latin and Cyrillic letters
    - Ensure Ukrainian text (Cyrillic script) is correctly parsed
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 3.7 Implement multiple answer format detection
    - Implement asterisk before answer detection (e.g., "А) *Text")
    - Implement asterisk after answer detection (e.g., "А) Text*")
    - Implement "ANSWER:" keyword detection (case-insensitive)
    - Implement "ВІДПОВІДЬ:" keyword detection (case-insensitive)
    - Maintain legacy "Correct:" format support
    - Implement priority order for multiple indicators
    - Strip asterisks from stored answer text
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  
  - [x] 3.8 Write property tests for Ukrainian support
    - **Property 28: Ukrainian Language Support**
    - **Property 29: Mixed Language Content Support**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.5**
  
  - [x] 3.9 Write property tests for answer format detection
    - **Property 30: Legacy "Correct:" Format Detection**
    - **Property 31: Asterisk Before Answer Detection**
    - **Property 32: Asterisk After Answer Detection**
    - **Property 33: "ANSWER:" Keyword Detection**
    - **Property 34: Ukrainian "ВІДПОВІДЬ:" Keyword Detection**
    - **Property 35: Format Variation Robustness**
    - **Property 36: Multiple Format Indicator Priority**
    - **Property 37: Missing Answer Format Error**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8**
  
  - [x] 3.10 Write unit tests for format detection edge cases
    - Test questions with multiple asterisks
    - Test case variations (ANSWER, answer, Answer, ВІДПОВІДЬ, відповідь)
    - Test spacing variations around asterisks and keywords
    - Test mixed format indicators in same question
    - _Requirements: 14.6, 14.7, 14.8_

- [ ] 4. Build Upload Modal component
  - [x] 4.1 Create UploadModal UI component
    - Build modal with text area for raw input
    - Add folder selection dropdown and "Create New Folder" option
    - Display parsed questions preview with validation status
    - Add confirm and cancel buttons
    - _Requirements: 2.1, 2.6, 2.9, 2.10_
  
  - [x] 4.2 Add file upload UI to UploadModal
    - Add tab switcher for "Paste Text" and "Upload Files" methods
    - Add file input accepting .txt and .docx files with multiple selection
    - Display selected file names and sizes
    - Add file removal functionality
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  
  - [x] 4.3 Implement file processing module
    - Install mammoth library for .docx text extraction
    - Create file processor function to read .txt files using File API
    - Create file processor function to extract text from .docx files using mammoth
    - Handle file reading errors and display error messages
    - _Requirements: 2.3, 2.4_
  
  - [x] 4.4 Implement multiple file combination logic
    - Combine text content from all successfully processed files
    - Pass combined text to existing parser
    - Track source file name for each parsed question
    - Display file name in preview for each question
    - _Requirements: 2.5, 2.6_
  
  - [x] 4.5 Implement upload flow logic
    - Connect parser to text input
    - Handle folder creation and selection
    - Call `uploadQuestions` server action on confirm
    - Display success/error messages
    - _Requirements: 2.7, 2.8_
  
  - [ ]* 4.6 Write property tests for file upload
    - **Property 38: TXT File Processing**
    - **Property 39: DOCX File Processing**
    - **Property 40: Multiple File Combination**
    - **Validates: Requirements 2.3, 2.4, 2.5**
  
  - [x] 4.7 Write property test for upload persistence
    - **Property 3: Valid Questions Are Persisted**
    - **Property 21: Database Operations Complete Before Confirmation**
    - **Validates: Requirements 2.7, 11.3**
  
  - [ ]* 4.8 Write unit tests for file upload error handling
    - Test corrupted .docx files
    - Test unsupported file types
    - Test file reading failures
    - Test empty files
    - _Requirements: 2.3, 2.4_
  
  - [x] 4.9 Write unit tests for upload error handling
    - Test network failures, validation errors
    - Test folder creation during upload
    - _Requirements: 2.8, 11.4_

- [ ] 5. Build Sidebar component
  - [x] 5.1 Create Sidebar UI component
    - Display list of folders fetched from database
    - Add "Upload Database" button that opens UploadModal
    - Add "Error Hub" navigation link
    - Add "Mock Exam" button
    - Highlight selected folder
    - _Requirements: 1.1, 2.1_
  
  - [x] 5.2 Implement folder selection logic
    - Handle folder click events
    - Update URL search params with selected folder ID
    - Trigger data loading for selected folder
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 5.3 Write unit tests for sidebar interactions
    - Test folder selection, button clicks
    - Test URL state updates
    - _Requirements: 1.1, 1.4_

- [ ] 6. Build Tester component (left panel)
  - [x] 6.1 Create Tester UI component
    - Display question text and answer options
    - Add mode toggle (Study Mode / Review Mode)
    - Add search bar for filtering questions
    - Add navigation buttons (previous/next)
    - Style correct/incorrect answer feedback
    - _Requirements: 3.1, 4.1, 5.1_
  
  - [x] 6.2 Implement Study Mode logic
    - Hide correct answer initially
    - Handle answer selection
    - Reveal correct/incorrect feedback on selection
    - Call `createUserError` for incorrect answers
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [x] 6.3 Implement Review Mode logic
    - Display correct answer immediately
    - Prevent error record creation in review mode
    - _Requirements: 4.1, 4.2_
  
  - [x] 6.4 Implement mode toggle and state preservation
    - Toggle between Study and Review modes
    - Maintain current question position on mode switch
    - _Requirements: 4.3, 4.4_
  
  - [x] 6.5 Implement search functionality
    - Filter questions based on search query
    - Match against question text and answer options
    - Clear search to restore full list
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 6.6 Write property tests for Tester logic
    - **Property 5: Incorrect Answers Create Error Records**
    - **Property 7: Review Mode Never Creates Errors**
    - **Property 8: Mode Switching Preserves Question Position**
    - **Property 9: Search Results Match Query**
    - **Property 10: Search Clear Restores Full List**
    - **Validates: Requirements 3.3, 4.2, 4.4, 5.1, 5.2, 5.3**
  
  - [x] 6.7 Write unit tests for Tester edge cases
    - Test empty question list, single question
    - Test navigation boundaries (first/last question)
    - Test special characters in search
    - _Requirements: 3.1, 5.1_

- [ ] 7. Build Notebook component (right panel)
  - [x] 7.1 Set up Tiptap editor
    - Install and configure Tiptap with StarterKit
    - Add Placeholder and Typography extensions
    - Create editor component with formatting toolbar
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [x] 7.2 Create Notes tab
    - Integrate Tiptap editor for free-form notes
    - Load notebook content when folder is selected
    - Save content changes to database with debouncing
    - _Requirements: 6.1, 6.3, 6.4_
  
  - [x] 7.3 Create Error Work tab
    - Display list of error questions for current folder
    - Show question text, user's answer (red), correct answer (green)
    - Add Tiptap editor for each error explanation
    - Save explanations to database
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [x] 7.4 Implement tab switching
    - Toggle between Notes and Error Work tabs
    - Maintain tab state in URL or component state
    - _Requirements: 6.1, 7.3_
  
  - [x] 7.5 Connect error creation to Error Work tab
    - Listen for new error records
    - Automatically append questions to Error Work tab
    - Update UI in real-time when errors are created
    - _Requirements: 3.4, 7.2_
  
  - [x] 7.6 Write property tests for Notebook
    - **Property 6: Error Records Appear in Error Work Tab**
    - **Property 11: Content Persistence Round Trip**
    - **Property 12: Folder Switch Loads Correct Notes**
    - **Property 13: Error Work Tab Shows All Folder Errors**
    - **Validates: Requirements 3.4, 6.3, 6.4, 7.2, 7.3**
  
  - [x] 7.7 Write unit tests for Notebook
    - Test editor initialization, formatting options
    - Test debounced save logic
    - Test error list rendering
    - _Requirements: 6.3, 7.3, 7.5_

- [x] 8. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Build Error Hub page
  - [x] 9.1 Create Error Hub UI component
    - Display errors grouped by folder
    - Show error count for each folder
    - Display recent errors within each group
    - Add navigation to folder on click
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 9.2 Implement error grouping and sorting logic
    - Group errors by folder_id
    - Sort errors by timestamp (most recent first)
    - Calculate error counts per folder
    - _Requirements: 8.2, 8.3, 8.5_
  
  - [x] 9.3 Implement navigation from Error Hub
    - Navigate to folder with Error Work tab active on click
    - Pass folder ID via URL params
    - _Requirements: 8.4_
  
  - [x] 9.4 Write property tests for Error Hub
    - **Property 14: Error Hub Groups By Folder**
    - **Property 15: Error Count Accuracy**
    - **Property 16: Error Hub Sorts By Timestamp**
    - **Validates: Requirements 8.2, 8.3, 8.5**
  
  - [x] 9.5 Write unit tests for Error Hub
    - Test empty error state
    - Test single folder with errors
    - Test navigation behavior
    - _Requirements: 8.1, 8.4_

- [ ] 10. Build Mock Exam feature
  - [x] 10.1 Create Mock Exam UI component
    - Display questions in Study Mode format
    - Show progress indicator (e.g., "Question 45 of 200")
    - Add exit button to return to normal mode
    - Display results summary on completion
    - _Requirements: 9.2, 9.4, 9.5, 9.6_
  
  - [x] 10.2 Implement mock exam generation
    - Call `getRandomQuestions(200)` to fetch random questions
    - Handle case where fewer than 200 questions exist
    - Initialize exam state with question list
    - _Requirements: 9.1_
  
  - [x] 10.3 Implement mock exam answer tracking
    - Track user answers in component state
    - Create error records for incorrect answers
    - Calculate correct/incorrect counts
    - _Requirements: 9.3, 9.5_
  
  - [x] 10.4 Implement results summary
    - Display total correct, incorrect, percentage score
    - Show option to review errors or exit
    - _Requirements: 9.5_
  
  - [x] 10.5 Write property tests for Mock Exam
    - **Property 17: Mock Exam Contains 200 Questions**
    - **Property 18: Mock Exam Tracks Errors**
    - **Property 19: Mock Exam Progress Accuracy**
    - **Property 20: Mock Exam Results Accuracy**
    - **Validates: Requirements 9.1, 9.3, 9.4, 9.5**
  
  - [x] 10.6 Write unit tests for Mock Exam
    - Test insufficient questions scenario
    - Test exam completion flow
    - Test exit functionality
    - _Requirements: 9.1, 9.5, 9.6_

- [ ] 11. Implement main dashboard page
  - [x] 11.1 Create main layout with split-screen
    - Set up layout with Sidebar, Tester (left), Notebook (right)
    - Apply Tailwind styling (white backgrounds, Zinc-200 borders)
    - Ensure responsive behavior
    - _Requirements: 10.5_
  
  - [x] 11.2 Implement folder selection flow
    - Load questions and notebook content when folder is selected
    - Update both Tester and Notebook components
    - Maintain selected folder state
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 11.3 Write property tests for folder selection
    - **Property 1: Folder Selection Loads Associated Data**
    - **Validates: Requirements 1.2, 1.3**
  
  - [x] 11.4 Write integration tests for main dashboard
    - Test full user flow: select folder, answer question, view error
    - Test switching between folders
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 12. Add error handling and data persistence
  - [x] 12.1 Implement error handling for database operations
    - Wrap all Supabase calls in try-catch blocks
    - Display toast notifications for errors
    - Add retry buttons for failed operations
    - _Requirements: 11.4_
  
  - [x] 12.2 Implement optimistic updates
    - Update UI immediately for user actions
    - Rollback on database failure
    - Show loading states during operations
    - _Requirements: 11.1, 11.2_
  
  - [x] 12.3 Add data validation
    - Validate all inputs before database operations
    - Ensure data consistency
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 12.4 Write property tests for data persistence
    - **Property 22: Database Failures Show Error Messages**
    - **Property 23: Stored Questions Have Required Fields**
    - **Property 27: Answer Order Preservation**
    - **Validates: Requirements 11.4, 12.1, 12.5**
  
  - [x] 12.5 Write unit tests for error handling
    - Test network failures, timeout scenarios
    - Test validation error messages
    - Test retry logic
    - _Requirements: 11.4_

- [ ] 13. Final polish and styling
  - [x] 13.1 Apply consistent styling
    - Ensure all components use Zinc theme
    - Apply white backgrounds and Zinc-200 borders
    - Use Lucide React icons throughout
    - Optimize typography for readability
    - _Requirements: 10.1, 10.2, 10.3, 10.6_
  
  - [x] 13.2 Add loading states and transitions
    - Add skeleton loaders for data fetching
    - Add smooth transitions for mode switching
    - Add animations for error feedback
    - _Requirements: 3.5, 4.1_
  
  - [x] 13.3 Implement accessibility features
    - Add ARIA labels to interactive elements
    - Ensure keyboard navigation works
    - Test with screen readers
    - _Requirements: 10.6_

- [x] 14. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: data layer → business logic → UI → integration
- All database operations include error handling and validation
- The design uses Next.js 14 App Router with Server Actions for data mutations
