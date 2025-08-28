#!/bin/bash

echo "🚀 Starting comprehensive event parsing to find all artist-event connections"
echo "================================================================"
echo ""

# Configuration
BATCH_SIZE=50
TOTAL_BATCHES=20  # Process up to 1000 events (20 batches of 50)
WAIT_BETWEEN_BATCHES=5

# Tracking variables
TOTAL_PARSED=0
TOTAL_ARTISTS=0
TOTAL_LINKS=0

# Process multiple batches
for ((i=1; i<=TOTAL_BATCHES; i++)); do
    SESSION_ID="batch-${i}-$(date +%s)"
    echo "📦 Starting Batch $i/$TOTAL_BATCHES (Session: $SESSION_ID)"
    
    # Start the parsing batch
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/parse-event-lineups \
        -H "Content-Type: application/json" \
        -d "{
            \"limit\": $BATCH_SIZE,
            \"sessionId\": \"$SESSION_ID\"
        }")
    
    EVENTS_FOUND=$(echo $RESPONSE | jq -r '.eventsFound // 0')
    
    if [ "$EVENTS_FOUND" = "0" ]; then
        echo "  ⚠️  No more events to process"
        break
    fi
    
    echo "  📊 Found $EVENTS_FOUND events to parse"
    
    # Wait for batch to complete
    COMPLETED=false
    while [ "$COMPLETED" = "false" ]; do
        sleep 3
        
        PROGRESS=$(curl -s "http://localhost:3000/api/parse-event-lineups?sessionId=$SESSION_ID")
        
        IS_COMPLETED=$(echo $PROGRESS | jq -r '.completed // false')
        PROGRESS_PCT=$(echo $PROGRESS | jq -r '.progress // 0')
        MESSAGE=$(echo $PROGRESS | jq -r '.message // ""')
        
        if [ "$IS_COMPLETED" = "true" ]; then
            COMPLETED=true
            
            # Get final stats
            BATCH_PARSED=$(echo $PROGRESS | jq -r '.eventsParsed // 0')
            BATCH_ARTISTS=$(echo $PROGRESS | jq -r '.artistsFound // 0')
            BATCH_LINKS=$(echo $PROGRESS | jq -r '.linksCreated // 0')
            
            # Update totals
            TOTAL_PARSED=$((TOTAL_PARSED + BATCH_PARSED))
            TOTAL_ARTISTS=$((TOTAL_ARTISTS + BATCH_ARTISTS))
            TOTAL_LINKS=$((TOTAL_LINKS + BATCH_LINKS))
            
            echo "  ✅ Batch $i complete:"
            echo "     Events parsed: $BATCH_PARSED"
            echo "     Artists found: $BATCH_ARTISTS"
            echo "     Links created: $BATCH_LINKS"
        else
            # Show progress
            printf "  ⏳ Progress: %d%% - %s\r" "$PROGRESS_PCT" "${MESSAGE:0:50}"
        fi
    done
    
    echo ""
    
    # Wait between batches if not the last one
    if [ $i -lt $TOTAL_BATCHES ] && [ "$EVENTS_FOUND" != "0" ]; then
        echo "  ⏸️  Waiting $WAIT_BETWEEN_BATCHES seconds before next batch..."
        sleep $WAIT_BETWEEN_BATCHES
    fi
    
    echo ""
done

# Final report
echo "================================================================"
echo "🎉 PARSING COMPLETE!"
echo "================================================================"
echo "📊 Total Events Processed: $TOTAL_PARSED"
echo "🎤 Total Artists Found: $TOTAL_ARTISTS"
echo "🔗 Total Links Created: $TOTAL_LINKS"
if [ $TOTAL_PARSED -gt 0 ]; then
    AVG_ARTISTS=$(echo "scale=2; $TOTAL_ARTISTS / $TOTAL_PARSED" | bc)
    echo "📈 Average Artists per Event: $AVG_ARTISTS"
fi
echo "================================================================"
