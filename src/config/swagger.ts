import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ayanshi Imitation BMS API",
      version: "1.0.0",
      description:
        "Backend API documentation for Ayanshi Imitation Business Management System. Built by Flowoid Technologies.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local Development Server",
      },
      {
        url: "http://140.245.193.49:3000",
        description: "Oracle VPS Production Server",
      },
    ],
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "Auth", description: "Authentication and session management" },
      { name: "Tenants", description: "Tenant and business onboarding" },
      { name: "Monitoring", description: "Admin system monitoring and live metrics" },
      { name: "Users", description: "User management" },
      { name: "Roles", description: "Role management" },
      { name: "Permissions", description: "Permission management" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          security: [],
          responses: {
            200: {
              description: "API is running",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "OK" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/AuthUserSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Log in with email or phone",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/AuthUserSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh the current session",
          security: [{ refreshTokenCookie: [] }],
          responses: {
            200: { $ref: "#/components/responses/AuthUserSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Log out and revoke refresh token",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current user profile",
          responses: {
            200: { $ref: "#/components/responses/UserSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/my-permissions": {
        get: {
          tags: ["Auth"],
          summary: "Get current user permissions",
          responses: {
            200: {
              description: "User permissions retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/MyPermissionsResponse",
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/change-password": {
        post: {
          tags: ["Auth"],
          summary: "Change current user password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/tenants": {
        post: {
          tags: ["Tenants"],
          summary: "Create tenant after user registration",
          description:
            "Creates a business tenant for the authenticated user and links the user as the first tenant user.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTenantRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/TenantSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/mine": {
        get: {
          tags: ["Tenants"],
          summary: "List current user's tenants",
          responses: {
            200: { $ref: "#/components/responses/TenantListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/monitoring/metrics": {
        get: {
          tags: ["Monitoring"],
          summary: "Get current system metrics",
          description:
            "Admin-only snapshot endpoint. For live admin panel updates, connect Socket.IO to namespace /admin-monitoring and listen for metrics:update. Clients may emit metrics:refresh to request an immediate update.",
          responses: {
            200: { $ref: "#/components/responses/MonitoringMetricsSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/users": {
        post: {
          tags: ["Users"],
          summary: "Create a user",
          description:
            "Creates a user. When roleId is provided, the authenticated user can only assign roles whose permissions are equal to or less than their own permissions. SUPER_ADMIN can assign any active role.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateUserRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/UserManagementSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
        get: {
          tags: ["Users"],
          summary: "List users",
          parameters: [
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Search by name, email, or phone",
            },
            {
              name: "roleId",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "isActive",
              in: "query",
              required: false,
              schema: { type: "boolean" },
            },
          ],
          responses: {
            200: { $ref: "#/components/responses/UserManagementListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/users/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdPathParam" }],
        get: {
          tags: ["Users"],
          summary: "Get a user by ID",
          responses: {
            200: { $ref: "#/components/responses/UserManagementSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Users"],
          summary: "Update a user",
          description:
            "Updates a user. When changing roleId, the authenticated user can only assign roles whose permissions are equal to or less than their own permissions. SUPER_ADMIN can assign any active role.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateUserRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/UserManagementSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Users"],
          summary: "Deactivate a user",
          description:
            "Soft-deactivates the user and revokes active sessions. It does not hard-delete user history.",
          responses: {
            200: { $ref: "#/components/responses/UserManagementSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/roles": {
        post: {
          tags: ["Roles"],
          summary: "Create a role",
          description:
            "Creates a role. Non-SUPER_ADMIN users can only include permissionIds they already have. Only SUPER_ADMIN can create system or default roles.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateRoleRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/RoleSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
        get: {
          tags: ["Roles"],
          summary: "List roles",
          description:
            "Lists roles visible to the authenticated user. Non-SUPER_ADMIN users only receive roles they can assign, meaning every permission on the role is already part of their own permissions.",
          responses: {
            200: { $ref: "#/components/responses/RoleListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/roles/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdPathParam" }],
        get: {
          tags: ["Roles"],
          summary: "Get a role by ID",
          description:
            "Returns a role only if the authenticated user can view and assign it. Non-SUPER_ADMIN users cannot view roles with permissions beyond their own.",
          responses: {
            200: { $ref: "#/components/responses/RoleSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Roles"],
          summary: "Update a role",
          description:
            "Updates a role. Non-SUPER_ADMIN users can only assign permissionIds they already have and cannot update system or default role flags.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateRoleRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/RoleSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Roles"],
          summary: "Delete a role",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/permissions": {
        post: {
          tags: ["Permissions"],
          summary: "Create a permission",
          description: "Creates a system permission. SUPER_ADMIN only.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreatePermissionRequest",
                },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/PermissionSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
        get: {
          tags: ["Permissions"],
          summary: "List permissions",
          description:
            "Lists permissions the authenticated user can assign. SUPER_ADMIN receives all permissions; other users only receive permissions already granted to their own role.",
          responses: {
            200: { $ref: "#/components/responses/PermissionListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/permissions/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdPathParam" }],
        get: {
          tags: ["Permissions"],
          summary: "Get a permission by ID",
          description:
            "Returns a permission only if it is already granted to the authenticated user's role. SUPER_ADMIN can view any permission.",
          responses: {
            200: { $ref: "#/components/responses/PermissionSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Permissions"],
          summary: "Update a permission",
          description: "Updates a system permission. SUPER_ADMIN only.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdatePermissionRequest",
                },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/PermissionSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Permissions"],
          summary: "Delete a permission",
          description: "Deletes a system permission. SUPER_ADMIN only.",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
    },
    components: {
      parameters: {
        IdPathParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Resource ID",
        },
      },
      responses: {
        AuthUserSuccess: {
          description:
            "Authenticated user response. Authentication cookies are set on successful auth operations.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthSessionResponse" },
            },
          },
        },
        UserSuccess: {
          description: "User response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserResponse" },
            },
          },
        },
        UserManagementSuccess: {
          description: "User management response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserManagementResponse" },
            },
          },
        },
        UserManagementListSuccess: {
          description: "User management list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserManagementListResponse" },
            },
          },
        },
        MessageSuccess: {
          description: "Message response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MessageResponse" },
            },
          },
        },
        TenantSuccess: {
          description: "Tenant response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TenantResponse" },
            },
          },
        },
        TenantListSuccess: {
          description: "Tenant list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TenantListResponse" },
            },
          },
        },
        MonitoringMetricsSuccess: {
          description: "System monitoring metrics response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MonitoringMetricsResponse" },
            },
          },
        },
        RoleSuccess: {
          description: "Role response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoleResponse" },
            },
          },
        },
        RoleListSuccess: {
          description: "Role list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoleListResponse" },
            },
          },
        },
        PermissionSuccess: {
          description: "Permission response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PermissionResponse" },
            },
          },
        },
        PermissionListSuccess: {
          description: "Permission list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PermissionListResponse" },
            },
          },
        },
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        UnauthorizedError: {
          description: "Authentication error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ForbiddenError: {
          description: "Authorization error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
      securitySchemes: {
        accessTokenCookie: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description:
            "Primary authentication method for browser clients. This HTTP-only cookie is issued by POST /api/auth/login and rotated through POST /api/auth/refresh.",
        },
        refreshTokenCookie: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description:
            "Refresh-session cookie used only by POST /api/auth/refresh. It is HTTP-only, long-lived, and rotated on every refresh.",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Optional fallback for non-browser clients. The backend also accepts Authorization: Bearer <access-token> for access-token protected routes.",
        },
      },
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["name", "phone", "password"],
          properties: {
            name: { type: "string", minLength: 2, example: "Ravi Shah" },
            email: {
              type: "string",
              format: "email",
              example: "ravi@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "password123",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "ravi@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "password123",
            },
          },
          description: "Provide either email or phone with the password.",
        },
        RefreshRequest: {
          type: "object",
          properties: {
            refreshToken: {
              type: "string",
              description: "Optional when refreshToken cookie is present.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "oldPassword123",
            },
            newPassword: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "newPassword123",
            },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["name", "phone", "password"],
          properties: {
            name: { type: "string", minLength: 2, example: "Vatsal Shah" },
            email: {
              type: "string",
              format: "email",
              example: "vatsal@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "password123",
            },
            roleId: {
              type: "string",
              format: "uuid",
              description:
                "Optional. If omitted, the backend uses the active default role. The selected role must not contain permissions beyond the authenticated user's own permissions, unless the authenticated user is SUPER_ADMIN.",
            },
            isActive: { type: "boolean", example: true },
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, example: "Vatsal Shah" },
            email: {
              type: "string",
              format: "email",
              nullable: true,
              example: "vatsal@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              description: "Optional admin password reset. Active sessions are revoked when changed.",
              example: "newPassword123",
            },
            roleId: {
              type: "string",
              format: "uuid",
              description:
                "The selected role must not contain permissions beyond the authenticated user's own permissions, unless the authenticated user is SUPER_ADMIN.",
            },
            isActive: { type: "boolean", example: true },
          },
        },
        CreateTenantRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 2,
              example: "Ayanshi Imitation",
            },
            slug: {
              type: "string",
              minLength: 2,
              example: "ayanshi-imitation",
              description:
                "Optional. If omitted, the backend generates a slug from the tenant name. The slug must be unique.",
            },
            email: {
              type: "string",
              format: "email",
              example: "contact@ayanshi.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            address: {
              type: "string",
              example: "Ahmedabad, Gujarat",
            },
            logoUrl: {
              type: "string",
              format: "uri",
              example: "https://example.com/logo.png",
            },
            businessCategory: {
              type: "string",
              example: "Imitation Jewellery",
            },
          },
        },
        CreateRoleRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2, example: "Cashier" },
            description: {
              type: "string",
              example: "Handles billing and payment operations",
            },
            permissionIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description:
                "Permission IDs to grant to this role. Non-SUPER_ADMIN users can only include permissions they already have.",
            },
          },
        },
        UpdateRoleRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, example: "Senior Cashier" },
            description: {
              type: "string",
              example: "Handles billing, payment, and reports",
            },
            isActive: { type: "boolean", example: true },
            permissionIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description:
                "Replacement permission IDs for this role. Non-SUPER_ADMIN users can only include permissions they already have.",
            },
          },
        },
        CreatePermissionRequest: {
          type: "object",
          required: ["code", "name"],
          properties: {
            code: { type: "string", minLength: 3, example: "orders.create" },
            name: { type: "string", minLength: 2, example: "Create Orders" },
            description: {
              type: "string",
              example: "Allows creating new orders",
            },
          },
        },
        UpdatePermissionRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, example: "Create Orders" },
            description: {
              type: "string",
              example: "Allows creating new orders",
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  example: "INVALID_ACCESS_TOKEN",
                },
                message: {
                  type: "string",
                  example: "Access token is invalid",
                },
                details: {
                  type: "object",
                  nullable: true,
                  additionalProperties: true,
                },
              },
              required: ["code", "message"],
            },
          },
          required: ["success", "error"],
        },
        AuthTiming: {
          type: "object",
          properties: {
            accessTokenExpiresAt: {
              type: "string",
              format: "date-time",
            },
            refreshTokenExpiresAt: {
              type: "string",
              format: "date-time",
            },
          },
          required: ["accessTokenExpiresAt", "refreshTokenExpiresAt"],
        },
        AuthSessionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
              },
              required: ["user"],
            },
          },
          required: ["success", "data"],
        },
        UserResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              $ref: "#/components/schemas/User",
            },
          },
          required: ["success", "data"],
        },
        MessageResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  example: "Operation completed successfully",
                },
              },
              required: ["message"],
            },
          },
          required: ["success", "data"],
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Ravi Shah" },
            email: {
              type: "string",
              example: "ravi@flowoid.com",
              nullable: true,
            },
            phone: { type: "string", example: "9876543210" },
            role: { type: "string", example: "SUPER_ADMIN" },
          },
        },
        ManagedUser: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Vatsal Shah" },
            email: {
              type: "string",
              format: "email",
              example: "vatsal@flowoid.com",
              nullable: true,
            },
            phone: { type: "string", example: "9876543210" },
            roleId: { type: "string", format: "uuid" },
            role: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "FREE_USERS" },
                description: {
                  type: "string",
                  nullable: true,
                  example: "Free plan users",
                },
              },
            },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            tenantUsers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  isActive: { type: "boolean", example: true },
                  tenant: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", example: "Ayanshi Imitation" },
                      slug: { type: "string", example: "ayanshi-imitation" },
                      status: {
                        type: "string",
                        enum: ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"],
                      },
                    },
                  },
                  role: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", example: "FREE_USERS" },
                    },
                  },
                },
              },
            },
          },
        },
        UserManagementResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ManagedUser" },
          },
          required: ["success", "data"],
        },
        UserManagementListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/ManagedUser" },
            },
          },
          required: ["success", "data"],
        },
        Tenant: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Ayanshi Imitation" },
            slug: { type: "string", example: "ayanshi-imitation" },
            email: {
              type: "string",
              format: "email",
              example: "contact@ayanshi.com",
              nullable: true,
            },
            phone: {
              type: "string",
              example: "9876543210",
              nullable: true,
            },
            address: {
              type: "string",
              example: "Ahmedabad, Gujarat",
              nullable: true,
            },
            status: {
              type: "string",
              enum: ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"],
            },
            trialEndsAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            subscriptionEndsAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            logoUrl: {
              type: "string",
              format: "uri",
              nullable: true,
            },
            businessCategory: {
              type: "string",
              example: "Imitation Jewellery",
              nullable: true,
            },
            users: {
              type: "array",
              items: { $ref: "#/components/schemas/TenantUser" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        TenantUser: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            roleId: { type: "string", format: "uuid" },
            isActive: { type: "boolean", example: true },
            role: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "TENANT_OWNER" },
              },
            },
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ravi Shah" },
                email: {
                  type: "string",
                  format: "email",
                  example: "ravi@flowoid.com",
                  nullable: true,
                },
                phone: { type: "string", example: "9876543210" },
              },
            },
          },
        },
        TenantResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Tenant" },
          },
          required: ["success", "data"],
        },
        TenantListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Tenant" },
            },
          },
          required: ["success", "data"],
        },
        MonitoringMetrics: {
          type: "object",
          properties: {
            timestamp: { type: "string", format: "date-time" },
            service: {
              type: "object",
              properties: {
                uptimeSeconds: { type: "integer", example: 3600 },
                pid: { type: "integer", example: 12345 },
                nodeVersion: { type: "string", example: "v24.14.1" },
                platform: { type: "string", example: "win32" },
                startedAt: { type: "string", format: "date-time" },
              },
            },
            system: {
              type: "object",
              properties: {
                hostname: { type: "string", example: "server-01" },
                cpuUsagePercent: { type: "number", example: 24.5 },
                cpuCount: { type: "integer", example: 8 },
                loadAverage: {
                  type: "array",
                  items: { type: "number" },
                  example: [0, 0, 0],
                },
                totalMemoryMb: { type: "number", example: 16384 },
                usedMemoryMb: { type: "number", example: 8192 },
                freeMemoryMb: { type: "number", example: 8192 },
                memoryUsagePercent: { type: "number", example: 50 },
              },
            },
            process: {
              type: "object",
              properties: {
                rssMb: { type: "number", example: 120.5 },
                heapTotalMb: { type: "number", example: 64 },
                heapUsedMb: { type: "number", example: 32.5 },
                externalMb: { type: "number", example: 4.2 },
              },
            },
            api: {
              type: "object",
              properties: {
                totalRequests: { type: "integer", example: 1500 },
                activeRequests: { type: "integer", example: 2 },
                averageResponseTimeMs: { type: "number", example: 48.25 },
                statusCodes: {
                  type: "object",
                  additionalProperties: { type: "integer" },
                  example: { "200": 1400, "400": 50, "500": 2 },
                },
                routes: {
                  type: "object",
                  additionalProperties: { type: "integer" },
                  example: { "GET /api/auth/me": 320 },
                },
              },
            },
            database: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["UP", "DOWN"] },
                latencyMs: { type: "integer", example: 12 },
              },
            },
          },
        },
        MonitoringMetricsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/MonitoringMetrics" },
          },
          required: ["success", "data"],
        },
        Worker: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Ramesh Patel" },
            phone: { type: "string", example: "9898989898" },
            address: { type: "string", example: "Gota, Ahmedabad" },
            idProofType: { type: "string", example: "Aadhar" },
            idProofNumber: { type: "string", example: "XXXX-XXXX-1234" },
            isActive: { type: "boolean", example: true },
          },
        },
        Design: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            designCode: { type: "string", example: "AY-NK-001" },
            name: { type: "string", example: "Classic Stone Necklace" },
            material: { type: "string", example: "Gold Plated" },
            finish: { type: "string", example: "Glossy" },
            diamondCount: { type: "integer", example: 12 },
            pieceRateRs: { type: "string", example: "18.00" },
            salePricePerDozen: { type: "string", example: "960.00" },
            isActive: { type: "boolean", example: true },
          },
        },
        Party: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            partyType: { type: "string", enum: ["DEALER", "SUPPLIER"] },
            name: { type: "string", example: "Mehta Jewels" },
            phone: { type: "string", example: "9712345678" },
            city: { type: "string", example: "Surat" },
            gstNumber: { type: "string", example: "24ABCDE1234F1Z5" },
            creditLimit: { type: "string", example: "50000.00" },
            creditDays: { type: "integer", example: 30 },
            isActive: { type: "boolean", example: true },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            orderNumber: { type: "string", example: "ORD-2025-0001" },
            status: {
              type: "string",
              enum: ["DRAFT", "CONFIRMED", "PACKED", "DISPATCHED", "CANCELLED"],
            },
            totalAmount: { type: "string", example: "4800.00" },
            isCreditOrder: { type: "boolean", example: true },
            dueDate: { type: "string", format: "date-time" },
            dispatchedAt: { type: "string", format: "date-time" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            paymentType: {
              type: "string",
              enum: [
                "DEALER_PAYMENT",
                "SUPPLIER_PAYMENT",
                "WORKER_PAYMENT",
                "DEALER_ADVANCE",
                "WORKER_ADVANCE",
              ],
            },
            paymentMode: {
              type: "string",
              enum: ["CASH", "BANK_TRANSFER", "UPI"],
            },
            amount: { type: "string", example: "4800.00" },
            isAdvance: { type: "boolean", example: false },
            paidAt: { type: "string", format: "date-time" },
          },
        },
        Assignment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            workerId: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            rawMaterialQty: { type: "number", example: 10 },
            expectedPieces: { type: "integer", example: 120 },
            returnedPieces: { type: "integer", example: 48 },
            rejectedPieces: { type: "integer", example: 2 },
            pieceRateAtAssignment: { type: "string", example: "18.00" },
            status: {
              type: "string",
              enum: [
                "ISSUED",
                "IN_PROGRESS",
                "PARTIALLY_RETURNED",
                "COMPLETED",
                "CLOSED",
              ],
            },
            issuedAt: { type: "string", format: "date-time" },
          },
        },
        InventoryStock: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            unpackagedPieces: { type: "integer", example: 84 },
            packagedDozens: { type: "integer", example: 15 },
            lowStockAlertAt: { type: "integer", example: 5 },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Permission: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            code: { type: "string", example: "orders.create" },
            name: { type: "string", example: "Create Orders" },
            description: {
              type: "string",
              example: "Create new orders",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PermissionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Permission" },
          },
          required: ["success", "data"],
        },
        PermissionListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
          },
          required: ["success", "data"],
        },
        Role: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Cashier" },
            description: {
              type: "string",
              example: "Handles order and payment operations",
              nullable: true,
            },
            isSystem: { type: "boolean", example: false },
            isActive: { type: "boolean", example: true },
            createdById: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "The user ID who created this role",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  roleId: { type: "string", format: "uuid" },
                  permissionId: { type: "string", format: "uuid" },
                  grantedAt: { type: "string", format: "date-time" },
                  permission: { $ref: "#/components/schemas/Permission" },
                },
              },
            },
          },
        },
        RoleResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Role" },
          },
          required: ["success", "data"],
        },
        RoleListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Role" },
            },
          },
          required: ["success", "data"],
        },
        RoleDetail: {
          type: "object",
          description: "Custom role with permissions and assigned users",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Cashier" },
            description: {
              type: "string",
              example: "Handles order and payment operations",
              nullable: true,
            },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  permission: { $ref: "#/components/schemas/Permission" },
                },
              },
            },
            tenantUsers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", example: "Ravi Shah" },
                      phone: { type: "string", example: "9876543210" },
                      email: {
                        type: "string",
                        example: "ravi@flowoid.com",
                        nullable: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        RoleAssignment: {
          type: "object",
          description: "Result of assigning/removing a custom role from a user",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            roleId: { type: "string", format: "uuid", nullable: true },
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ravi Shah" },
                phone: { type: "string", example: "9876543210" },
                email: {
                  type: "string",
                  example: "ravi@flowoid.com",
                  nullable: true,
                },
              },
            },
            role: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Cashier" },
              },
            },
          },
        },
        TenantPermissionsResponse: {
          type: "object",
          properties: {
            tenant: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ayanshi Imitation" },
                slug: { type: "string", example: "ayanshi-imitation" },
              },
            },
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
            permissionCodes: {
              type: "array",
              items: { type: "string" },
              example: [
                "orders.view",
                "orders.create",
                "payments.view",
                "payments.create",
              ],
            },
          },
        },
        MyPermissionsResponse: {
          type: "object",
          properties: {
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string", example: "orders.view" },
                  name: { type: "string", example: "View Orders" },
                  module: { type: "string", example: "orders" },
                  action: { type: "string", example: "view" },
                },
              },
            },
            isFullAccess: {
              type: "boolean",
              example: false,
              description: "True only for SUPER_ADMIN",
            },
          },
        },
        AllPermissionsResponse: {
          type: "object",
          properties: {
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
            grouped: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { $ref: "#/components/schemas/Permission" },
              },
              example: {
                orders: [
                  {
                    id: "uuid",
                    code: "orders.view",
                    name: "View Orders",
                    module: "orders",
                    action: "view",
                  },
                  {
                    id: "uuid",
                    code: "orders.create",
                    name: "Create Orders",
                    module: "orders",
                    action: "create",
                  },
                ],
              },
            },
          },
        },
      },
    },
    security: [{ accessTokenCookie: [] }, { bearerAuth: [] }],
  },
  apis: ["./src/modules/**/*.routes.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
