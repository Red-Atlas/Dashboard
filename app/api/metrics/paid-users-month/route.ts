export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  return Response.json({
    value: Math.floor(Math.random() * 500) + 1200,
    timestamp: new Date().toISOString(),
  })
}
