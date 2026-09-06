# CI/CD Pipeline

Set up automated deployment pipeline using GitHub Actions or similar to automatically test and deploy changes to the production server when code is pushed to the main branch.

## Rationale
As a solo developer project, automated deployment reduces manual effort and ensures consistent, reliable deployments. This builds on the test suite to create a robust development workflow.

## User Stories
- As a developer, I want automated deployment so that I can ship improvements quickly
- As a developer, I want deployment protection so that broken code never reaches users

## Acceptance Criteria
- [ ] Push to main branch triggers automated test run
- [ ] Successful tests automatically deploy to production
- [ ] Failed tests block deployment with clear error messages
- [ ] Deployment status is visible in repository
- [ ] Rollback capability exists for failed deployments
