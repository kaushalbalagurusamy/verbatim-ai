think
Create a new service for **$ARGUMENTS** following the service architecture pattern.

Steps:

1. Create service file in `lib/services/[domain]-service.ts`:

   ```typescript
   /**
    * Service for managing [domain] operations
    * Extends BaseService for common functionality
    */
   export class DomainService extends BaseService {
     /**
      * Service method with validation
      * @param data - Input data
      * @param userId - Authenticated user ID
      * @returns Promise resolving to result
      */
     async methodName(data: InputType, userId: string): Promise<ResultType> {
       // Validate input
       const validated = this.validate(data);

       // Business logic

       // Database operation
       return await this.database.operation();
     }
   }
   ```

2. Create corresponding API route in `app/api/[domain]/route.ts`

3. Add TypeScript interfaces in `lib/types/[domain].types.ts`

4. Update service exports

Return CREATED with service structure.
