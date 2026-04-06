# PPE Video Processing Pipeline (Mermaid)

```mermaid
flowchart LR
    A[Video Input RTSP/File] --> B[Frame Sampling 5-10 FPS]
    B --> C[Preprocess Resize Normalize]
    C --> D[Detection person helmet vest]
    D --> E[Tracking Track ID]
    E --> F[Person-PPE Matching IoU ROI]
    F --> G{PPE Decision}

    G -->|OK| H1[Normal Record]
    G -->|No Helmet| H2[Violation Candidate]
    G -->|No Vest| H2
    G -->|No Helmet and No Vest| H2

    H2 --> I[Temporal Filter N consecutive frames]
    I --> J{Cooldown Check}
    J -->|Yes| K[Skip Event Accumulate only]
    J -->|No| L[Publish Violation Event]

    L --> M[(Snapshot Save)]
    L --> N[(DB Log Save)]
    L --> O[Dashboard Feed Update]
    H1 --> N
```

## VS Code
- `.mmd`: Command Palette -> `View: Show Mermaid Chart`
- `.md`: `Ctrl+Shift+V` (Markdown Preview)
