# Azle-Based Forum Application

![Forum Logo](https://i.imgur.com/a2AGOQh.png)

## Introduction

This README provides an overview and usage guide for a forum application implemented using the azle framework for the Internet Computer. The application features functionality for creating and managing forums, threads, messages, and user profiles.
Features

-   Forum Management: Create and list forums, each with a unique identifier, name, and description.
-   Thread Management: Create threads within forums and retrieve individual or all threads.
-   Message Posting: Post messages in threads, including content, timestamp, and image URLs.
-   User Profiles: Register users with avatars and roles (Regular User or Admin), and update user avatars.

## Setup

-   Install Dependencies: Ensure azle and other necessary packages are installed.
-   Deploy Canister

### Deploying the canister

To deploy the canister you should run:

1. `dfx start` - to run the Azle environment
2. `dfx deploy` - to deploy the canister and create a UI interface for it

## API Overview

The application's API consists of two main parts:

Queries and Transactions.

### Queries

    `getForums()`: Retrieves a list of all forums.
    `getThreads()`: Retrieves a list of all threads.
    `getThread(threadId: Principal)`: Retrieves a specific thread by its ID.
    `getThreadMessages(threadId: Principal)`: Retrieves messages in a specific thread.
    `getUsers()`: Retrieves a list of all users.
    `getUser(userId: Principal)`: Retrieves a specific user by their ID.

### Transactions

    `createForum(name: text, description: text)`: Creates a new forum.
    `createThread(name: text, description: text, forumId: Principal)`: Creates a new thread in a forum.
    `createMessage(content: text, imageUrl: text, threadId: Principal)`: Posts a new message in a thread.
    `register(name: text, avatar: text)`: Registers a new user.
    `changeAvatar(avatar: text)`: Updates the avatar for the current user.

## Usage:

It's recommended to use the UI that is generated when you deploy the canister using the `dfx deploy` command.

To post a message to a thread you need to have:

1. A registration
2. Created a forum
3. Created a thread
4. Post a message and pass the thread id to the `createMessage` method.

## Error Handling

The application uses a robust error handling system to manage exceptions and provide meaningful error messages.

## Conclusion

This forum application showcases the capabilities of the azle framework for building scalable and efficient applications on the Internet Computer. With its comprehensive set of features, it provides a solid foundation for community-driven discussions.

For more information and updates, visit the Azle Documentation.
