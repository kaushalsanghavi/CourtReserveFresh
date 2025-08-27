import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedMember } from "./QuickBooking";

interface CommentTextareaProps {
  date: string;
}

export default function CommentTextarea({ date }: CommentTextareaProps) {
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedMemberId, selectedMember } = useSelectedMember();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!selectedMemberId || !selectedMember) {
        throw new Error("Please select a member");
      }

      return apiRequest("POST", "/api/comments", {
        memberId: selectedMemberId,
        memberName: selectedMember.name,
        date,
        comment: commentText,
      });
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/comments", date] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add comment",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment.trim());
  }, [comment, addCommentMutation]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  }, []);

  if (!selectedMemberId) {
    return <p className="text-sm text-gray-500 italic">Select a member to add comments</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={comment}
        onChange={handleChange}
        placeholder="Add a comment about this day..."
        className="text-sm"
        rows={2}
        data-testid={`textarea-comment-${date}`}
        autoComplete="off"
      />
      <Button
        type="submit"
        size="sm"
        disabled={!comment.trim() || addCommentMutation.isPending}
        className="bg-blue-100 text-blue-700 hover:bg-blue-200"
        data-testid={`button-add-comment-${date}`}
      >
        {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
      </Button>
    </form>
  );
}