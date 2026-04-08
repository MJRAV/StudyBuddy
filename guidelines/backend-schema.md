# Backend Schema (Firebase)

## Auth

- Provider: Firebase Authentication
- Methods enabled in app: Email/Password and Google Sign-In

## Firestore Collections

### users/{uid}

Core account profile document.

Fields:
- uid: string
- name: string
- email: string
- bio: string
- yearLevel: string
- major: string
- semester: string
- userRole: "mentor" | "mentee" | ""
- selectedCourses: string[]
- courseRoles: { [courseName: string]: "mentor" | "mentee" }
- hasSeenOnboarding: boolean
- createdAt: server timestamp
- updatedAt: server timestamp

### users/{uid}/conversations/{conversationId}

Conversation metadata for each user.

Fields:
- name: string
- role: string
- lastMessage: string
- unread: number
- updatedAt: server timestamp

### users/{uid}/conversations/{conversationId}/messages/{messageId}

Realtime message stream for the selected conversation.

Fields:
- text: string
- senderId: string
- senderName: string
- createdAt: server timestamp

### community_posts/{postId}

Public community wall posts.

Fields:
- authorId: string
- content: string
- createdAt: server timestamp
- updatedAt: server timestamp

## Security Rules

Rules file: firestore.rules

Current policy:
- Users can only read/write their own users/{uid} docs and nested conversations/messages.
- Authenticated users can read community_posts.
- Only the author can create/update/delete their own community_posts.
