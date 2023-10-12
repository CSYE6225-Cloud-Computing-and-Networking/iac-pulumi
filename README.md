# iac-pulumi

#  Infrastructure as Code
- We are using pulumi to create and destroy our infra.
- We are creating a vpc and creating 6 subnets in it.
- 3 of the subnets are public and the other 3 are private.
- Two route tables will be created, one would be for the public and the other for private.
- A internet gateway would be connected to the public route table

# Pulumi commands
- create resources - pulumi up
- deletet the resources - pulumi down
- list stacks - pulumi stack ls

