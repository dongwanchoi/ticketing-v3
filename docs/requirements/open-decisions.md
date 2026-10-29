# Decisions requiring approval
## Highest impact: hold lifecycle and limits (pending)
Recommend configurable 5-minute TTL and maximum 4 seats per hold; alternatives 3/10 minutes and 1/6 seats. Short TTL reduces inventory blocking but increases checkout expiry. Approval is required before final schema/state transitions for holds are implemented. No implicit adoption from V2.
Also pending: full/partial cancellation, resale after cancellation, payment retry after failure, role transitions, seat grading and deployment costs. Recommend full cancellation only for initial scope, but do not implement until approved. Core integrity and authorization changes require review.
