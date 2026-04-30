# Security Specification - TaxiFlow

## 1. Data Invariants
- Every Ride must have a valid `riderId` matching the creator's UID.
- A Driver can only update their own `driverStatus` and `location`.
- A Ride status can only be updated by the assigned Driver (after acceptance) or the Admin.
- Only the Rider can update a Ride status to 'cancelled' if it hasn't been 'accepted' yet.
- Private user info (PII) is strictly accessible only by the owner or Admin.

## 2. The "Dirty Dozen" Payloads (WIP - These will be tested in firestore.rules)
1. Rider trying to update another Rider's ride request.
2. Driver trying to accept a ride they already rejected (simulated).
3. User trying to set themselves as 'admin' role in their public profile.
4. User trying to write to another user's 'private/info' collection.
5. Driver trying to update status to 'completed' before it was 'started'.
6. Client sending a massive string as an address to bloat document size.
7. User trying to set a fake 'createdAt' timestamp instead of server time.
8. Unauthenticated user trying to read any driver status.
9. Driver trying to update their location with non-numeric coordinates.
10. Rider trying to set an extremely high rating (>5) for a driver.
11. User trying to delete a 'completed' ride record.
12. Driver trying to update a ride they are not assigned to.

## 3. Test Runner (Conceptual)
The `firestore.rules` will be validated against these scenarios using helper functions.
