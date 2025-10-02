(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-MAX-DEPENDENTS u101)
(define-constant ERR-INVALID-SUPPORT-AMOUNT u102)
(define-constant ERR-INVALID-FREQUENCY u103)
(define-constant ERR-INVALID-PENALTY-RATE u104)
(define-constant ERR-INVALID-VOTING-THRESHOLD u105)
(define-constant ERR-AGREEMENT-ALREADY-EXISTS u106)
(define-constant ERR-AGREEMENT-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-SUPPORT u110)
(define-constant ERR-INVALID-MAX-OBLIGATION u111)
(define-constant ERR-AGREEMENT-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-AGREEMENTS-EXCEEDED u114)
(define-constant ERR-INVALID-AGREEMENT-TYPE u115)
(define-constant ERR-INVALID-INTEREST-RATE u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-STATUS u120)

(define-data-var next-agreement-id uint u0)
(define-data-var max-agreements uint u1000)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)

(define-map agreements
  uint
  {
    name: (string-utf8 100),
    max-dependents: uint,
    support-amount: uint,
    frequency: uint,
    penalty-rate: uint,
    voting-threshold: uint,
    timestamp: uint,
    sponsor: principal,
    immigrant: principal,
    agreement-type: (string-utf8 50),
    interest-rate: uint,
    grace-period: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool,
    min-support: uint,
    max-obligation: uint
  }
)

(define-map agreements-by-name
  (string-utf8 100)
  uint)

(define-map agreement-updates
  uint
  {
    update-name: (string-utf8 100),
    update-max-dependents: uint,
    update-support-amount: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-agreement (id uint))
  (map-get? agreements id)
)

(define-read-only (get-agreement-updates (id uint))
  (map-get? agreement-updates id)
)

(define-read-only (is-agreement-registered (name (string-utf8 100)))
  (is-some (map-get? agreements-by-name name))
)

(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)

(define-private (validate-max-dependents (dependents uint))
  (if (and (> dependents u0) (<= dependents u50))
      (ok true)
      (err ERR-INVALID-MAX-DEPENDENTS))
)

(define-private (validate-support-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-SUPPORT-AMOUNT))
)

(define-private (validate-frequency (freq uint))
  (if (> freq u0)
      (ok true)
      (err ERR-INVALID-FREQUENCY))
)

(define-private (validate-penalty-rate (rate uint))
  (if (<= rate u100)
      (ok true)
      (err ERR-INVALID-PENALTY-RATE))
)

(define-private (validate-voting-threshold (threshold uint))
  (if (and (> threshold u0) (<= threshold u100))
      (ok true)
      (err ERR-INVALID-VOTING-THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-agreement-type (type (string-utf8 50)))
  (if (or (is-eq type "family") (is-eq type "employment") (is-eq type "community"))
      (ok true)
      (err ERR-INVALID-AGREEMENT-TYPE))
)

(define-private (validate-interest-rate (rate uint))
  (if (<= rate u20)
      (ok true)
      (err ERR-INVALID-INTEREST-RATE))
)

(define-private (validate-grace-period (period uint))
  (if (<= period u30)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-support (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-SUPPORT))
)

(define-private (validate-max-obligation (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-OBLIGATION))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-agreements (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-AGREEMENTS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-agreements new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-agreement
  (agreement-name (string-utf8 100))
  (max-dependents uint)
  (support-amount uint)
  (frequency uint)
  (penalty-rate uint)
  (voting-threshold uint)
  (immigrant principal)
  (agreement-type (string-utf8 50))
  (interest-rate uint)
  (grace-period uint)
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-support uint)
  (max-obligation uint)
)
  (let (
        (next-id (var-get next-agreement-id))
        (current-max (var-get max-agreements))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-AGREEMENTS-EXCEEDED))
    (try! (validate-name agreement-name))
    (try! (validate-max-dependents max-dependents))
    (try! (validate-support-amount support-amount))
    (try! (validate-frequency frequency))
    (try! (validate-penalty-rate penalty-rate))
    (try! (validate-voting-threshold voting-threshold))
    (try! (validate-agreement-type agreement-type))
    (try! (validate-interest-rate interest-rate))
    (try! (validate-grace-period grace-period))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-support min-support))
    (try! (validate-max-obligation max-obligation))
    (asserts! (is-none (map-get? agreements-by-name agreement-name)) (err ERR-AGREEMENT-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set agreements next-id
      {
        name: agreement-name,
        max-dependents: max-dependents,
        support-amount: support-amount,
        frequency: frequency,
        penalty-rate: penalty-rate,
        voting-threshold: voting-threshold,
        timestamp: block-height,
        sponsor: tx-sender,
        immigrant: immigrant,
        agreement-type: agreement-type,
        interest-rate: interest-rate,
        grace-period: grace-period,
        location: location,
        currency: currency,
        status: true,
        min-support: min-support,
        max-obligation: max-obligation
      }
    )
    (map-set agreements-by-name agreement-name next-id)
    (var-set next-agreement-id (+ next-id u1))
    (print { event: "agreement-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-agreement
  (agreement-id uint)
  (update-name (string-utf8 100))
  (update-max-dependents uint)
  (update-support-amount uint)
)
  (let ((agreement (map-get? agreements agreement-id)))
    (match agreement
      a
        (begin
          (asserts! (is-eq (get sponsor a) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-max-dependents update-max-dependents))
          (try! (validate-support-amount update-support-amount))
          (let ((existing (map-get? agreements-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id agreement-id) (err ERR-AGREEMENT-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-name (get name a)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete agreements-by-name old-name)
                  (map-set agreements-by-name update-name agreement-id)
                  (ok true)
                )
            )
          )
          (map-set agreements agreement-id
            {
              name: update-name,
              max-dependents: update-max-dependents,
              support-amount: update-support-amount,
              frequency: (get frequency a),
              penalty-rate: (get penalty-rate a),
              voting-threshold: (get voting-threshold a),
              timestamp: block-height,
              sponsor: (get sponsor a),
              immigrant: (get immigrant a),
              agreement-type: (get agreement-type a),
              interest-rate: (get interest-rate a),
              grace-period: (get grace-period a),
              location: (get location a),
              currency: (get currency a),
              status: (get status a),
              min-support: (get min-support a),
              max-obligation: (get max-obligation a)
            }
          )
          (map-set agreement-updates agreement-id
            {
              update-name: update-name,
              update-max-dependents: update-max-dependents,
              update-support-amount: update-support-amount,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "agreement-updated", id: agreement-id })
          (ok true)
        )
      (err ERR-AGREEMENT-NOT-FOUND)
    )
  )
)

(define-public (get-agreement-count)
  (ok (var-get next-agreement-id))
)

(define-public (check-agreement-existence (name (string-utf8 100)))
  (ok (is-agreement-registered name))
)