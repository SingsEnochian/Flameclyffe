# Notion Data Contract

## Character Index

Data source: `c2066399-029a-4d58-bf13-8743473276f2`

The front end reads public records and uses:

- Name
- Slug
- Summary
- Role
- Canon Status
- Status
- First Appearance
- House / Affiliation
- Relationship Tags
- Magic / Skills
- Books
- Nature
- Portrait
- Visual Assets
- Featured
- Public
- Sort Order

Only `Public = true` records are routed.

## Visual Asset Library

Data source: `68143630-059f-429a-885d-902948b45c4a`

The front end reads:

- Asset Name
- Slug
- Asset Type
- Image
- Alt Text
- Caption
- Character Links
- Character Notes
- Book
- Tags
- Canon Status
- Source
- Version
- Aspect Ratio
- Focal Point
- Featured
- Public
- Display Order

Notion file URLs expire. Treat the Notion page ID and Slug as stable identity, and refresh file URLs at render or revalidation time.
