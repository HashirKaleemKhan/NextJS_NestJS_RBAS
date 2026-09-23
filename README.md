# NextJS_NestJS_RBAS

A full-stack **Role-Based Access Control (RBAC) platform** built with **Next.js, NestJS, PostgreSQL, Prisma, GraphQL, Apollo Client, and JWT authentication**.

This project was built to explore and implement the architecture of a real-world enterprise-style application where authentication, authorization, hierarchical organization structures, permissions, auditing, and API design all work together.

Rather than building a basic CRUD application, the project focuses on designing a maintainable backend architecture and implementing **fine-grained authorization and business rules across the full application stack**.

## What I Built

The application provides a complete administration platform for managing:

* **Users**
* **Roles**
* **Groups**
* **Permissions**
* **Organizational hierarchy**
* **Audit logs**
* **Authentication and authorization**

Users can be organized into management hierarchies, assigned roles, and granted permissions through groups. Access to application functionality is controlled through permissions rather than relying only on frontend visibility.

### Core capabilities

* JWT-based authentication
* Secure login/logout flow
* Password hashing with bcrypt
* Role-based access control
* Fine-grained permission checks
* Protected backend operations
* User management and status control
* Role management
* Group and permission management
* User-manager hierarchy
* Organizational hierarchy visualization
* Audit logging for important administrative actions
* Search and pagination
* Validation of incoming data
* Business-rule enforcement at the backend
* GraphQL API with typed queries and mutations
* Apollo Client integration with Next.js
* PostgreSQL persistence through Prisma
* REST and GraphQL architecture explored in the same project

## Architecture

The application follows a layered full-stack architecture:


┌─────────────────────────────────────────────┐
│                  Next.js                    │
│                                             │
│  Pages / Components / UI / Apollo Client    │
└──────────────────────┬──────────────────────┘
                       │
                       │ GraphQL
                       ▼
┌─────────────────────────────────────────────┐
│                  NestJS                    │
│                                             │
│  GraphQL Resolvers                          │
│  Authentication                             │
│  Authorization / Permission Guards          │
│  Business Services                          │
│  Validation                                 │
│  Audit Logging                              │
└──────────────────────┬──────────────────────┘
                       │
                       │ Prisma
                       ▼
┌─────────────────────────────────────────────┐
│                PostgreSQL                   │
│                                             │
│ Users / Roles / Groups / Permissions        │
│ Hierarchy / Audit Logs                      │
└─────────────────────────────────────────────┘


## Authentication & Authorization

One of the main goals of this project was to understand the difference between **authentication** and **authorization** and implement both correctly.

Authentication establishes who the user is using JWT-based authentication.

Authorization determines what the authenticated user is allowed to do.

The backend enforces permissions through protected GraphQL operations. For example:


users.read
users.create
users.update
users.delete

roles.manage

logs.read


The frontend uses these permissions to control the user interface, while the backend independently enforces them through authorization guards.

This means that hiding a button in the frontend is **not considered a security mechanism**. The actual authorization decision remains on the server.

## RBAC Model

The authorization model is structured around:


User
  │
  ▼
Role
  │
  ▼
Group
  │
  ▼
Permissions


The project also supports organizational relationships:

Manager
   │
   ├── Employee
   │      ├── Employee
   │      └── Employee
   │
   └── Employee

This allowed me to work with authorization rules that go beyond simple "admin/user" roles.

Examples include:

* protecting administrative operations
* preventing unauthorized users from modifying resources
* restricting role and permission management
* validating role hierarchy relationships
* preventing invalid reporting structures
* protecting administrative roles from inappropriate deactivation
* preventing deletion of roles that are still assigned to users

These rules are enforced in the backend rather than relying on the frontend.

## GraphQL & Apollo

The project initially used a REST-based architecture and was later migrated to **GraphQL with Apollo Client**.

This provided practical experience with both API styles and allowed me to understand the differences between them.

The GraphQL API exposes typed:

* Queries
* Mutations
* Object types
* Input types
* Authentication-protected operations
* Permission-protected operations

The Next.js frontend uses Apollo Client for:

* GraphQL queries
* GraphQL mutations
* authentication headers
* request management
* client-side caching
* refetching data after mutations

This migration was particularly useful for understanding how frontend data requirements can be expressed directly through GraphQL queries instead of relying on fixed REST response structures.

## Audit Logging

Administrative operations are tracked through an audit logging system.

Audit records can contain information such as:

* action
* entity
* entity ID
* actor
* description
* previous values
* new values
* IP address
* user agent
* timestamp

This provides a foundation for tracking important administrative changes and understanding how auditability can be incorporated into backend systems.

## Frontend

The frontend is built with **Next.js and React** and provides administration interfaces for:

* Dashboard
* Users
* Roles
* Groups
* Hierarchy
* Audit Logs
* Authentication

The UI also reflects the user's permissions, while the backend remains responsible for enforcing actual access control.

## Backend

The backend is built with **NestJS** using a modular architecture.

Major backend modules include:

Auth
Users
Roles
Groups
Audit Logs
GraphQL
Prisma

The backend separates API/resolver responsibilities from business logic, allowing the same underlying services and business rules to support different API approaches.

## Database

The application uses **PostgreSQL** with **Prisma ORM**.

The database models relationships between:

* Users
* Roles
* Groups
* Permissions
* User hierarchy
* Audit logs

Prisma provides type-safe database access and migration support.

## Engineering Concepts Practiced

This project gave me practical experience with several concepts that are important in professional backend and full-stack development:

* Full-stack application architecture
* REST API design
* GraphQL API design
* Dependency injection
* Modular backend architecture
* Authentication
* Authorization
* RBAC
* Fine-grained permissions
* JWT
* Password hashing
* DTOs and validation
* ORM and relational database design
* PostgreSQL
* Prisma
* React / Next.js
* Apollo Client
* GraphQL resolvers
* Protected API operations
* Hierarchical data structures
* Business-rule validation
* Audit logging
* Pagination and search
* Frontend/backend security boundaries
* Git branching and version control
* Incremental migration from REST to GraphQL

## REST → GraphQL Migration

An important part of the project was deliberately maintaining a working REST implementation while developing the GraphQL architecture separately.

The repository contains a dedicated GraphQL branch so the REST implementation remains available as a reference.

This allowed me to compare two API architectures using essentially the same application:

REST
Next.js → Axios → NestJS Controllers → Services → Prisma

GraphQL
Next.js → Apollo Client → NestJS Resolvers → Services → Prisma

This was an intentional learning exercise to understand not only how to build an application, but also how architectural decisions affect the way the frontend and backend communicate.

## Project Goal

The goal of this project was to move beyond basic tutorials and gain practical experience designing and implementing a **complete full-stack application with authentication, authorization, relational data, business rules, and multiple API architectures**.

The project was developed incrementally, validating each major subsystem before moving to the next:

Authentication
      ↓
Users
      ↓
Roles
      ↓
Groups & Permissions
      ↓
Hierarchy
      ↓
Audit Logging
      ↓
GraphQL
      ↓
Apollo Client
      ↓
REST → GraphQL Migration

The result is a working full-stack RBAC platform that demonstrates how modern frontend, backend, database, authentication, authorization, and API technologies can be combined into a cohesive application.

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* Apollo Client
* GraphQL

### Backend

* NestJS
* TypeScript
* GraphQL
* Apollo Server
* JWT
* Passport
* bcrypt
* class-validator

### Database

* PostgreSQL
* Prisma ORM

### Development

* npm
* Git
* GitHub
* VS Code

## What This Project Represents

This project represents a hands-on transition from understanding individual technologies to understanding how they fit together in a **realistic full-stack system**.

The emphasis was not simply on making pages and APIs work, but on understanding the boundaries between:

UI
 ↓
API
 ↓
Authentication
 ↓
Authorization
 ↓
Business Logic
 ↓
Data Access
 ↓
Database

and implementing those boundaries in a maintainable way.
