"use client";

import React, { useEffect, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import testFeedData from "./data/Unique_Contractors.json";
import axios from "axios";
import "./StreamingFeed.css";

interface FeedItem {
  _id: number;
  item: string;
  created_at: string;
  contractor_name: string;
  lead_time: number;
  status: string;
  submittal_number: string;
}

const StreamingFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    setFeedItems(testFeedData);
  }, []);

  // React Spring animation
  const props = useSpring({
    to: { scrollPosition: scrollPosition + 1 },
    from: { scrollPosition: 0 },
    config: { duration: 2000 }, // Scrolling Speed
    onRest: () => setScrollPosition((prev) => (prev + 1) % testFeedData.length),
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
          <div key={feed._id} className="feed-item">
          <div className="feed-header">
            <div className={`feed-status ${getStatusClass(feed.status)}`}>
              {feed.status}
            </div>
            <small className="feed-date">
              {new Date(feed.created_at).toLocaleString()}
            </small>
          </div>
          <div className="feed-details">
            <div className="feed-item-detail">{feed.item}</div>
            <div className="feed-contractor">{feed.contractor_name}</div>
          </div>
        </div>
        ))}
      </animated.div>
    </div>
  );
};

export default StreamingFeed;