import { useState, useCallback, useRef, useEffect } from "react";
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
import { MessageCircle } from "lucide-react";

interface CommentsProps {
  date: string;
  variant?: 'inline' | 'compact' | 'modal';
}

function CommentForm({ date }: { date: string }) {
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedMemberId, selectedMember } = useSelectedMember();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [shouldFocus, setShouldFocus] = useState(false);

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
      setShouldFocus(true);
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
    setShouldFocus(false);
  }, []);

  // Restore focus after successful submission
  useEffect(() => {
    if (shouldFocus && textareaRef.current) {
      textareaRef.current.focus();
      setShouldFocus(false);
    }
  }, [shouldFocus]);

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
        spellCheck={false}
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

export default function Comments({ date, variant = 'modal' }: CommentsProps) {
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments", date],
  });

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
      <CommentForm date={date} />
    </div>
  );

  // Modal variant - opens comments in a dialog
  if (variant === 'modal') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            data-testid={`button-view-comments-${date}`}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Comments
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-auto h-4 px-1 text-xs">
                {comments.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comments for {format(new Date(date), "MMMM d, yyyy")}</DialogTitle>
            <DialogDescription>
              Member comments and coordination for this day.
            </DialogDescription>
          </DialogHeader>
          <CommentsDisplay inDialog={true} />
        </DialogContent>
      </Dialog>
    );
  }

  // Inline variants
  return <CommentsDisplay />;
}