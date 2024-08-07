"use client";

import React, { useEffect, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import axios from "axios";
import "./StreamingFeed.css";

interface FeedItem {
  id: string;
  spec_description: string;
  date_last_updated: string;
  responsible_contractor: string;
  lead_time: number;
  procurement_status: string;
  submittal_number: string;
}

const StreamingFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<FeedItem[]>("http://localhost:8000/feed_items");
        setFeedItems(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // React Spring animation
  const props = useSpring({
    to: { scrollPosition: scrollPosition + 1 },
    from: { scrollPosition: 0 },
    config: { duration: 2000 }, // Scrolling Speed
    onRest: () => setScrollPosition((prev) => (prev + 1) % feedItems.length),
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case "In Production":
        return "status-in-production";
      case "On Site":
        return "status-on-site";
      case "Released":
        return "status-released";
      default:
        return "";
    }
  };

  return (
    <div className="streaming-feed">
      <animated.div
        style={{
          transform: props.scrollPosition.to(
            (y) => `translateY(-${y * 100}px)`
          ),
        }}
      >
        {feedItems.map((feed) => (
          <div key={feed.id} className="feed-item">
          <div className="feed-header">
            <div className={`feed-status ${getStatusClass(feed.procurement_status)}`}>
              {feed.procurement_status}
            </div>
            <small className="feed-date">
              {new Date(feed.date_last_updated).toLocaleString()}
            </small>
          </div>
          <div className="feed-details">
            <div className="feed-item-detail">{feed.spec_description}</div>
            <div className="feed-contractor">{feed.responsible_contractor}</div>
          </div>
        </div>
        ))}
      </animated.div>
    </div>
  );
};

export default StreamingFeed;