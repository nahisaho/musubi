# OpenAPI Template

## Overview

Template for documenting REST APIs using OpenAPI 3.0 specification.

---

## Basic Template

```yaml
openapi: 3.0.3
info:
  title: [API Name]
  description: |
    [API description in Markdown]
  version: 1.0.0
  contact:
    name: API Support
    email: api@example.com
  license:
    name: MIT

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging
  - url: http://localhost:3000/v1
    description: Development

tags:
  - name: Users
    description: User management
  - name: Orders
    description: Order operations

paths:
  /users:
    get:
      tags:
        - Users
      summary: List all users
      description: Returns a paginated list of users
      operationId: listUsers
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: status
          in: query
          description: Filter by status
          schema:
            type: string
            enum: [active, inactive]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalError'
      security:
        - bearerAuth: []
    
    post:
      tags:
        - Users
      summary: Create a user
      description: Creates a new user account
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
            example:
              name: John Doe
              email: john@example.com
              password: secretpassword123
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: Email already exists
      security:
        - bearerAuth: []

  /users/{userId}:
    get:
      tags:
        - Users
      summary: Get a user
      description: Returns a single user by ID
      operationId: getUser
      parameters:
        - $ref: '#/components/parameters/UserIdParam'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'
      security:
        - bearerAuth: []

    put:
      tags:
        - Users
      summary: Update a user
      operationId: updateUser
      parameters:
        - $ref: '#/components/parameters/UserIdParam'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserRequest'
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'
      security:
        - bearerAuth: []

    delete:
      tags:
        - Users
      summary: Delete a user
      operationId: deleteUser
      parameters:
        - $ref: '#/components/parameters/UserIdParam'
      responses:
        '204':
          description: User deleted
        '404':
          $ref: '#/components/responses/NotFound'
      security:
        - bearerAuth: []

components:
  schemas:
    User:
      type: object
      required:
        - id
        - name
        - email
      properties:
        id:
          type: string
          format: uuid
          description: Unique identifier
          example: 550e8400-e29b-41d4-a716-446655440000
        name:
          type: string
          description: User's full name
          example: John Doe
        email:
          type: string
          format: email
          description: Email address
          example: john@example.com
        status:
          type: string
          enum: [active, inactive]
          default: active
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    UserList:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    CreateUserRequest:
      type: object
      required:
        - name
        - email
        - password
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 100
        email:
          type: string
          format: email
        password:
          type: string
          format: password
          minLength: 8

    UpdateUserRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 100
        email:
          type: string
          format: email

    PaginationMeta:
      type: object
      properties:
        total:
          type: integer
        page:
          type: integer
        perPage:
          type: integer
        totalPages:
          type: integer

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string

  parameters:
    UserIdParam:
      name: userId
      in: path
      required: true
      description: User ID
      schema:
        type: string
        format: uuid
    
    PageParam:
      name: page
      in: query
      description: Page number
      schema:
        type: integer
        minimum: 1
        default: 1
    
    LimitParam:
      name: limit
      in: query
      description: Items per page
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: VALIDATION_ERROR
            message: Invalid request data
    
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: UNAUTHORIZED
            message: Authentication required
    
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: NOT_FOUND
            message: Resource not found
    
    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: INTERNAL_ERROR
            message: An unexpected error occurred

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key

security:
  - bearerAuth: []
```

---

## OpenAPI Checklist

### Info
- [ ] Title and description
- [ ] Version number
- [ ] Contact information

### Paths
- [ ] All endpoints documented
- [ ] HTTP methods specified
- [ ] Parameters defined
- [ ] Request bodies described
- [ ] Response codes listed

### Components
- [ ] Schemas for all models
- [ ] Reusable parameters
- [ ] Common responses
- [ ] Security schemes

### Examples
- [ ] Request examples
- [ ] Response examples
- [ ] Error examples
