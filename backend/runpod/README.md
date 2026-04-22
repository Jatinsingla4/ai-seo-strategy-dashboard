# RunPod Workflow Contract

The current app uses inline JavaScript AI calls. In the ThreeZinc architecture, heavier workflows should move behind a Python service on RunPod.

## Initial Endpoints To Implement

- `POST /cluster-keywords`
- `POST /generate-roadmap`
- `POST /analyze-gaps`
- `POST /suggest-links`

## Suggested Request Shape

```json
{
  "projectId": "proj_123",
  "promptTemplateId": "prompt_default_v1",
  "keywords": [],
  "competitorKeywords": []
}
```

## Suggested Response Shape

```json
{
  "jobId": "job_123",
  "status": "completed",
  "result": {}
}
```

## Notes

- Keep prompt version IDs explicit so results can be traced in D1.
- Return deterministic error codes for validation, provider failure, and timeout conditions.
- Prefer workflow-level logging that can be surfaced back into the dashboard later.
