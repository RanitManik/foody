"use client";

import { useState } from "react";
import { gql } from "@apollo/client/core";
import { useMutation, useQuery } from "@apollo/client/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function FeedbackModal({
    open,
    onOpenChange,
}: {
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
}) {
    const [value, setValue] = useState("");
    const [isSending, setIsSending] = useState(false);

    const ME = gql`
        query Me {
            me {
                id
                email
                firstName
                lastName
            }
        }
    `;

    const CREATE_FEEDBACK = gql`
        mutation CreateFeedback($input: CreateFeedbackInput!) {
            createFeedback(input: $input) {
                id
                createdAt
            }
        }
    `;

    type MeData = { me?: { id: string; email?: string; firstName?: string; lastName?: string } };
    const { data: meData } = useQuery<MeData>(ME);
    const me = meData?.me;

    type CreateFeedbackData = { createFeedback: { id: string; createdAt: string } };
    type CreateFeedbackVars = { input: { message: string; email?: string } };

    const [createFeedback] = useMutation<CreateFeedbackData, CreateFeedbackVars>(CREATE_FEEDBACK);

    async function handleSend() {
        if (!value.trim()) {
            toast.error("Please add some feedback before sending.");
            return;
        }

        try {
            setIsSending(true);

            const variables: { input: { message: string; email?: string } } = {
                input: { message: value.trim() },
            };

            if (me?.email) variables.input.email = me.email;

            await createFeedback({ variables });

            toast.success("Thanks — we received your feedback!");
            setValue("");
            onOpenChange?.(false);
        } catch (err) {
            console.error("createFeedback error", err);
            toast.error("Failed to send feedback. Please try again later.");
        } finally {
            setIsSending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Help us improve Foody</DialogTitle>
                    <DialogDescription>{`We'd love your feedback.`}</DialogDescription>
                </DialogHeader>

                <div>
                    <label className="mb-2 block text-sm font-medium">Share your thoughts</label>
                    <Textarea
                        rows={10}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={"What's working well? What's confusing? What's missing?"}
                        aria-label="Feedback text"
                    />
                </div>

                <DialogFooter>
                    <div className="flex w-full justify-between gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSend} disabled={isSending}>
                            {isSending ? "Sending…" : "Send"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
