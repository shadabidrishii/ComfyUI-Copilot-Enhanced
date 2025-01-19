import { BaseMessage } from './BaseMessage';

interface UserMessageProps {
    content: string;
}

export function UserMessage({ content }: UserMessageProps) {
    return (
        <BaseMessage name="User" isUser={true}>
            <div className="w-full rounded-lg border border-gray-700 p-4 text-gray-700 text-sm break-words">
                <p className="whitespace-pre-wrap">{content}</p>
            </div>
        </BaseMessage>
    );
} 