import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Comments from "@/components/Comments";
import { format } from "date-fns";

export default function CommentsDemo() {
  const sampleDate = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Comments Design Options</h1>
        <p className="text-gray-600">
          Compare different visual approaches for the comments feature. Each variant reduces visual clutter while maintaining functionality.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Compact Variant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-green-700">Compact Variant (Recommended)</CardTitle>
            <p className="text-sm text-gray-600">
              Minimal visual footprint - just a clickable comment icon with count. Click to open comments modal.
            </p>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg p-4 bg-white max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Wed, Aug 21</h4>
                  <p className="text-sm text-gray-500">Wednesday</p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600">2/6</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">BOOKED MEMBERS</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">John</span>
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Sarah</span>
                </div>
              </div>
              
              <Button className="w-full font-medium bg-green-100 text-green-700 hover:bg-green-200 mb-3">
                Book Slot
              </Button>
              
              <Comments date={sampleDate} variant="compact" />
            </div>
          </CardContent>
        </Card>

        {/* Modal Variant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-blue-700">Modal Variant</CardTitle>
            <p className="text-sm text-gray-600">
              Shows comment count text with separate "View" button. More explicit but takes slightly more space.
            </p>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg p-4 bg-white max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Wed, Aug 21</h4>
                  <p className="text-sm text-gray-500">Wednesday</p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600">2/6</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">BOOKED MEMBERS</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">John</span>
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Sarah</span>
                </div>
              </div>
              
              <Button className="w-full font-medium bg-green-100 text-green-700 hover:bg-green-200 mb-3">
                Book Slot
              </Button>
              
              <Comments date={sampleDate} variant="modal" />
            </div>
          </CardContent>
        </Card>

        {/* Inline Variant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-orange-700">Inline Variant (Original)</CardTitle>
            <p className="text-sm text-gray-600">
              Full comments section embedded directly in the card. Makes cards taller but shows everything at once.
            </p>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg p-4 bg-white max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Wed, Aug 21</h4>
                  <p className="text-sm text-gray-500">Wednesday</p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600">2/6</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">BOOKED MEMBERS</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">John</span>
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Sarah</span>
                </div>
              </div>
              
              <Button className="w-full font-medium bg-green-100 text-green-700 hover:bg-green-200">
                Book Slot
              </Button>
              
              <Comments date={sampleDate} variant="inline" />
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">Design Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-700">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-medium">✓ Compact:</span>
                <span>Cleanest design - just a clickable icon with comment count. Best for minimal clutter.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">✓ Modal:</span>
                <span>More explicit with separate "View" button. Better for users who need clearer affordances.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">⚠ Inline:</span>
                <span>Shows all comments directly in cards. Makes cards very tall and harder to scan.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}