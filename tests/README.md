# Test Documentation

This directory contains end-to-end tests for the SnapVault application using Playwright.

## Setup

Make sure you have the dependencies installed:

```bash
yarn install
```

Install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

### Run all tests
```bash
yarn test
```

### Run tests with UI mode (interactive)
```bash
yarn test:ui
```

### Run tests in headed mode (see browser)
```bash
yarn test:headed
```

### Debug tests
```bash
yarn test:debug
```

### Run specific test file
```bash
npx playwright test user-creation.spec.ts
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
```

## Test Structure

### User Creation Tests (`playwright/user-creation.spec.ts`)

This test suite covers the user registration functionality:

#### Core Registration Tests
- **Successful registration**: Tests the complete flow from form submission to dashboard access
- **Form validation**: Tests client-side validation for empty fields, invalid formats, etc.
- **Server-side validation**: Tests API error responses for duplicate emails, invalid data, etc.

#### User Experience Tests
- **Form switching**: Tests toggling between login and registration forms
- **Loading states**: Verifies that forms show proper loading indicators
- **Error clearing**: Tests that validation errors clear when users start typing
- **Accessibility**: Verifies proper labels and form structure

#### Integration Tests
- **Post-registration flow**: Tests that users can immediately access vault features after registration
- **Navigation**: Tests that all dashboard features are accessible after registration
- **Logout flow**: Tests complete user session management

## Test Data

Tests use dynamic data generation with timestamps to avoid conflicts:
- Usernames: `testuser{timestamp}`
- Emails: `testuser{timestamp}@example.com`
- Passwords: `testpassword123`

## Configuration

Tests are configured in `playwright.config.ts`:
- **Base URL**: `http://localhost:3000` (configurable via `NEXT_PUBLIC_APP_URL`)
- **Timeout**: 30 seconds per test
- **Retries**: Automatic retries on failure in CI
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure

## Writing New Tests

When adding new tests:

1. Follow the existing naming convention
2. Use descriptive test names that explain the behavior being tested
3. Use proper `beforeEach` hooks for setup
4. Include both positive and negative test cases
5. Test error states and edge cases
6. Verify accessibility where applicable

## Debugging

### Common Issues

1. **Test timeouts**: Increase timeout or check if the app is running
2. **Element not found**: Use `page.locator()` with proper selectors
3. **Network issues**: Check API responses and timing

### Debugging Tips

1. Use `page.pause()` to pause execution and inspect the page
2. Use `--headed` flag to see tests running in browser
3. Check test output for detailed error messages
4. Use `page.screenshot()` to capture state at specific points

## CI/CD

Tests are designed to run in CI environments:
- Headless mode by default
- Automatic app startup via `webServer` configuration
- Proper cleanup between tests
- Parallel execution support

## Best Practices

1. **Independence**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use unique data for each test run to avoid conflicts
3. **Assertions**: Use meaningful assertions that clearly indicate what's being tested
4. **Selectors**: Prefer role-based and label-based selectors over CSS selectors
5. **Waiting**: Use proper waiting strategies for dynamic content
