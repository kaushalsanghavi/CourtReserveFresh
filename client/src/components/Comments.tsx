import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedMember } from "./QuickBooking";
import type { Comment } from "@shared/schema";
import { format } from "date-fns";

interface CommentsProps {
  date: string;
}

export default function Comments({ date }: CommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedMemberId, selectedMember } = useSelectedMember();

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments", date],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!selectedMemberId || !selectedMember) {
        throw new Error("Please select a member");
      }

      return apiRequest("POST", "/api/comments", {
        memberId: selectedMemberId,
        memberName: selectedMember.name,
        date,
        comment,
      });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/comments", date] });
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h5 className="text-xs text-gray-500 uppercase tracking-wide mb-2">COMMENTS</h5>
      
      {/* Existing comments */}
      {comments.length > 0 ? (
        <div className="space-y-2 mb-3" data-testid={`comments-list-${date}`}>
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-md p-2" data-testid={`comment-${comment.id}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{comment.memberName}</span>
                <span className="text-xs text-gray-500">
                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm text-gray-800">{comment.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic mb-3">No comments yet</p>
      )}

      {/* Add new comment */}
      {selectedMemberId ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment about this day..."
            className="text-sm"
            rows={2}
            data-testid={`textarea-comment-${date}`}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
            data-testid={`button-add-comment-${date}`}
          >
            {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 italic">Select a member to add comments</p>
      )}
    </div>
  );
}