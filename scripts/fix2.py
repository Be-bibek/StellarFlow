import re

with open('backend/contracts/src/lib.rs', 'r') as f:
    content = f.read()

# Fix unwrap in tests
content = content.replace("proposal.amount", "proposal.unwrap().amount")
content = content.replace("proposal.required", "proposal.unwrap().required")
content = content.replace("proposal.executed", "proposal.unwrap().executed")
content = content.replace("proposal.approvers", "proposal.unwrap().approvers")

with open('backend/contracts/src/lib.rs', 'w') as f:
    f.write(content)
