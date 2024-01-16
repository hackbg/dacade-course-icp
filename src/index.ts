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

    /*//////////////////////////////////////////////////////////////
                            Transactions
    //////////////////////////////////////////////////////////////*/

    createForum: update(
        [text, text],
        Result(text, text),
        async (name, description) => {
            try {
                const id = generateId();
                const forum = {
                    id,
                    name,
                    description,
                };
                forums.insert(id, forum);
                return Ok(`Forum created - ${id}`);
            } catch (error) {
                return Err("Error creating forum");
            }
        }
    ),

    createThread: update(
        [text, text, Principal],
        Result(text, text),
        async (name, description, forumId) => {
            try {
                const id = generateId();
                const thread = {
                    id,
                    name,
                    description,
                    forumId,
                };
                threads.insert(id, thread);
                return Ok(`Thread created - ${id.toString()}`);
            } catch (error) {
                return Err("Error creating thread");
            }
        }
    ),

    createMessage: update(
        [text, text, Principal],
        Result(text, text),
        async (content, imageUrl, threadId) => {
            const message = {
                id: generateId(),
                content,
                timestamp: Math.floor(new Date().getTime() / 1000),
                imageUrl,
                userId: ic.caller(),
                threadId,
            };

            if (!imageUrl.startsWith("ipfs://")) {
                return Err("Image url must start with ipfs://");
            }

            try {
                const threadMessages = messages.get(threadId);
                if ("None" in threadMessages) {
                    messages.insert(threadId, [message]);
                } else {
                    const messages = threadMessages.Some.push(message);
                    messages.remove(threadId);
                    messages.insert(threadId, messages);
                }
                return Ok("Message created");
            } catch (error) {
                return Err("Unexpected error");
            }
        }
    ),

    register: update([text, text], Result(text, text), async (name, avatar) => {
        // if user is first user, make admin
        const user: typeof User = {
            id: ic.caller(),
            name,
            avatar,
            role: { RegularUser: null },
        };

        if (users.isEmpty()) {
            user.role = { Admin: null };
        }

        // check if user already exists
        if (users.containsKey(ic.caller())) {
            return Err("User already exists");
        }

        try {
            users.insert(ic.caller(), user);
            return Ok(`User created - ${user.id.toString()}`);
        } catch (error) {
            return Err("Unexpected error");
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
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}
