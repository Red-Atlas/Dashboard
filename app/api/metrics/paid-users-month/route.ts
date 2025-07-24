export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  return Response.json({
    value: 0,
    timestamp: new Date().toISOString(),
  })
}
