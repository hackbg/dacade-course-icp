import {
    Canister,
    query,
    text,
    update,
    Record,
    Vec,
    nat64,
    StableBTreeMap,
    Principal,
    Variant,
    Err,
    Ok,
    Null,
    Result,
    Tuple,
    ic,
} from "azle";

const Role = Variant({
    RegularUser: Null,
    Admin: Null,
});

const User = Record({
    id: Principal,
    name: text,
    avatar: text,
    role: Role,
});

const Forum = Record({
    id: Principal,
    name: text,
    description: text,
});

const Thread = Record({
    id: Principal,
    name: text,
    description: text,
    forumId: Principal,
});

const Message = Record({
    id: Principal,
    content: text,
    timestamp: nat64,
    imageUrl: text,
    userId: Principal,
    threadId: Principal,
});

const forums = StableBTreeMap(Principal, Forum, 0);
const threads = StableBTreeMap(Principal, Thread, 1);
const messages = StableBTreeMap(Principal, Vec(Message), 2);
const users = StableBTreeMap(Principal, User, 3);

export default Canister({
    /*//////////////////////////////////////////////////////////////
                                Queries
    //////////////////////////////////////////////////////////////*/

    getForums: query([], Vec(Tuple(Principal, Forum)), async () => {
        return forums.items();
    }),

    getThreads: query([], Vec(Tuple(Principal, Thread)), async () => {
        return threads.items();
    }),

    getThread: query([Principal], Result(Thread, text), async (threadId) => {
        const thread = threads.get(threadId);
        if ("None" in thread) {
            Err("Thread does not exist");
        }
        return Ok(thread.Some);
    }),

    getThreadMessages: query(
        [Principal],
        Result(Vec(Message), text),
        async (threadId) => {
            const messagesInThread = messages.get(threadId);
            if ("None" in messagesInThread) {
                return Err("No messages in thread");
            }

            return Ok(messagesInThread.Some);
        }
    ),

    getUsers: query([], Vec(Tuple(Principal, User)), async () => {
        return users.items();
    }),

    getUser: query([Principal], Result(User, text), async (userId) => {
        const user = users.get(userId);
        if ("None" in user) {
            return Err(`User with id=${userId} not found`);
        }
        return Ok(user.Some);
    }),

    getMessages: query([], Vec(Tuple(Principal, Message)), async () => {
        return messages.items();
    }),

    /*//////////////////////////////////////////////////////////////
                            Transactions
    //////////////////////////////////////////////////////////////*/

    createForum: update(
    [text, text],
    Result(text, text),
    async (name, description) => {
        try {
            // Reentrancy guard
            ic.stable.set<string>("creatingForum", "true");

            const id = generateId();
            const forum = {
                id,
                name,
                description,
            };

            // Ensure forum with the same ID doesn't already exist
            if (forums.containsKey(id)) {
                return Err("Forum with the same ID already exists");
            }

            forums.insert(id, forum);
            return Ok(`Forum created - ${id}`);
        } catch (error) {
            // Log or handle the error appropriately
            return Err("Error creating forum");
        } finally {
            // Remove reentrancy flag
            ic.stable.set<string>("creatingForum", "false");
        }
    }
),

    createThread: update(
    [text, text, Principal],
    Result(text, text),
    async (name, description, forumId) => {
        try {
            // Reentrancy guard
            ic.stable.set<string>("creatingThread", "true");

            const id = generateId();
            const thread = {
                id,
                name,
                description,
                forumId,
            };

            // Ensure thread with the same ID doesn't already exist
            if (threads.containsKey(id)) {
                return Err("Thread with the same ID already exists");
            }

            // Ensure the specified forumId exists
            if (!forums.containsKey(forumId)) {
                return Err("Forum does not exist");
            }

            threads.insert(id, thread);
            return Ok(`Thread created - ${id.toString()}`);
        } catch (error) {
            // Log or handle the error appropriately
            return Err("Error creating thread");
        } finally {
            // Remove reentrancy flag
            ic.stable.set<string>("creatingThread", "false");
        }
    }
),

    
    createMessage: update(
    [text, text, Principal],
    Result(text, text),
    async (content, imageUrl, threadId) => {
        try {
            // Reentrancy guard
            ic.stable.set<string>("creatingMessage", "true");

            const message = {
                id: generateId(),
                content,
                timestamp: Math.floor(new Date().getTime() / 1000),
                imageUrl,
                userId: ic.caller(),
                threadId,
            };

            // Validate image URL
            if (!imageUrl.startsWith("ipfs://")) {
                return Err("Image URL must start with ipfs://");
            }

            // Ensure the specified threadId exists
            if (!threads.containsKey(threadId)) {
                return Err("Thread does not exist");
            }

            // Retrieve or create messages in the thread
            const threadMessages = messages.getOrElse(threadId, Vec<Message>());
            threadMessages.push(message);
            messages.insert(threadId, threadMessages);

            return Ok("Message created");
        } catch (error) {
            // Log or handle the error appropriately
            return Err("Unexpected error");
        } finally {
            // Remove reentrancy flag
            ic.stable.set<string>("creatingMessage", "false");
        }
    }
),

    register: update([text, text], Result(text, text), async (name, avatar) => {
    try {
        // Reentrancy guard
        ic.stable.set<string>("registeringUser", "true");

        const callerId = ic.caller();

        // Check if user already exists
        if (users.containsKey(callerId)) {
            return Err("User already exists");
        }

        // Create a new user
        const user: typeof User = {
            id: callerId,
            name,
            avatar,
            role: { RegularUser: null }, // Default role for new users
        };

        // Check if the user is the first user (make admin)
        if (users.isEmpty()) {
            user.role = { Admin: null };
        }

        // Insert the new user
        users.insert(callerId, user);

        return Ok(`User created - ${user.id.toString()}`);
    } catch (error) {
        // Log or handle the error appropriately
        return Err("Unexpected error");
    } finally {
        // Remove reentrancy flag
        ic.stable.set<string>("registeringUser", "false");
    }
}),


    changeAvatar: update([text], Result(text, text), async (avatar) => {
        // check if user already exists
        if ("None" in users.get(ic.caller())) {
            return Err("User does not exist");
        }

        try {
            // update user
            const callerId = ic.caller();
            const user = users.get(callerId);
            user.Some.avatar = avatar;

            // update user in map
            users.remove(callerId);
            users.insert(callerId, user);
            return Ok("Avatar updated");
        } catch (error) {
            return Err("Unexpected error");
        }
    }),
});


function generateId(): Principal {
    const randomBytes = new Uint8Array(29);
    crypto.getRandomValues(randomBytes);

    return Principal.fromUint8Array(randomBytes);
}
