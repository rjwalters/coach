import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

export default function CoachPanel() {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Your AI Coach</CardTitle>
        <CardDescription>Get personalized guidance and support</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm">
              Hi! I'm your personal coach. I'm here to help you stay on track with your tasks
              and achieve your goals.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">What I can help with:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Breaking down complex tasks</li>
              <li>Prioritizing your todo list</li>
              <li>Keeping you motivated</li>
              <li>Tracking your progress</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              AI coaching features coming soon...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
