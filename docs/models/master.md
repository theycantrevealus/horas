```mermaid
sequenceDiagram
participant Surrounding
participant Non Core
participant Core

Surrounding ->>+ Non Core: Manual Redeem Request

alt is eligible
	Non Core ->>+ Core: Integration
else is not eligible
	Non Core -->> Surrounding: Response Result
end

Core -->>- Non Core: Response Result
Non Core -->>- Surrounding: Response Result
```