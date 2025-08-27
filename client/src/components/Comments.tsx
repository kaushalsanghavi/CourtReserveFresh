import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedMember } from "./QuickBooking";
import type { Comment } from "@shared/schema";
import { format } from "date-fns";
import { MessageCircle, Plus } from "lucide-react";

interface CommentsProps {
  date: string;
  variant?: 'inline' | 'compact' | 'modal';
}

export default function Comments({ date, variant = 'modal' }: CommentsProps) {
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
      // Use a more stable query invalidation approach
      requestAnimationFrame(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/comments", date] });
        queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      });
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
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  }, [newComment, addCommentMutation]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  }, []);

  const CommentsDisplay = ({ inDialog = false }: { inDialog?: boolean }) => (
    <div className={inDialog ? "" : "mt-4 pt-4 border-t border-gray-200"}>
      {!inDialog && <h5 className="text-xs text-gray-500 uppercase tracking-wide mb-2">COMMENTS</h5>}
      
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
            onChange={handleTextareaChange}
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

  // Modal variant - opens comments in a dialog
  if (variant === 'modal') {
    return (
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              data-testid={`button-view-comments-${date}`}
            >
              View
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Comments for {format(new Date(date), "MMM d, yyyy")}</DialogTitle>
              <DialogDescription>
                View and add comments for coordination on this date
              </DialogDescription>
            </DialogHeader>
            <CommentsDisplay inDialog={true} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Compact variant - shows just a comment indicator with count, clickable bubble
  if (variant === 'compact') {
    return (
      <div className="mt-3 flex items-center justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs flex items-center gap-1 hover:bg-gray-100"
              data-testid={`button-comments-${date}`}
            >
              <MessageCircle className="w-3 h-3 text-gray-400" />
              {comments.length > 0 && (
                <span className="text-xs text-gray-600">{comments.length}</span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Comments for {format(new Date(date), "MMM d, yyyy")}</DialogTitle>
              <DialogDescription>
                View and add comments for coordination on this date
              </DialogDescription>
            </DialogHeader>
            <CommentsDisplay inDialog={true} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Inline variant - full comments section (original behavior)
  return <CommentsDisplay />;
}