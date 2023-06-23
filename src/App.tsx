import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './tailwind.css';

const key='your-key';
const secret='your-secret';

interface VinylData {
  id: string;
  cover_image: string;
  title: string;
}

interface MarketplaceData {
  listing_id: number;
  price: string;
  condition: string;
  seller: {
    username: string;
  };
}

const VinylSearch = () => {
  const [limitedEditionVinyls, setLimitedEditionVinyls] = useState<VinylData[]>([]);
  const [marketplaceData, setMarketplaceData] = useState<Record<string, MarketplaceData[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);

  useEffect(() => {
    fetchLimitedEditionVinyls();
  }, []);

  const fetchLimitedEditionVinyls = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `https://api.discogs.com/database/search?type=release&format=vinyl&year=2023&sort=year&sort_order=desc&key=${key}&secret=${secret}`
      );
      setLimitedEditionVinyls(response.data.results.slice(0, 12));
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const searchVinyls = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `https://api.discogs.com/database/search?type=release&format=vinyl&year=2023&sort=year&sort_order=desc&key=${key}&secret=${secret}&q=${searchTerm}`
      );
      setLimitedEditionVinyls(response.data.results);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const fetchMarketplaceData = async () => {
    const vinylIds = limitedEditionVinyls.map((vinyl) => vinyl.id);
    const marketplaceData: Record<string, MarketplaceData[]> = {};
  
    for (const vinylId of vinylIds) {
      try {
        await sleep(1000); // Attendre 1 seconde avant chaque requête
        const response = await axios.get(
          `https://api.discogs.com/marketplace/search?release_id=${vinylId}&key=${key}&secret=${secret}`
        );
        marketplaceData[vinylId] = response.data.results;
      } catch (error) {
        console.error(error);
      }
    }
  
    setMarketplaceData(marketplaceData);
  };
  
  const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
  

  useEffect(() => {
    fetchMarketplaceData();
  }, [limitedEditionVinyls]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const unloadedImages = limitedEditionVinyls
        .filter((vinyl) => !loadedImages.includes(vinyl.id))
        .map((vinyl) => vinyl.id);
      reloadImages(unloadedImages);
    }, 60000);

    return () => clearTimeout(timeout);
  }, [limitedEditionVinyls, loadedImages]);

  const reloadImages = async (vinylIds: string[]) => {
    setIsLoadingImages(true);

    for (const vinylId of vinylIds) {
      try {
        const vinylIndex = limitedEditionVinyls.findIndex((vinyl) => vinyl.id === vinylId);
        if (vinylIndex !== -1) {
          const response = await axios.get(`https://api.discogs.com/releases/${vinylId}`);
          const updatedVinyl = response.data;

          setLimitedEditionVinyls((prevVinyls) => {
            const updatedVinyls = [...prevVinyls];
            updatedVinyls[vinylIndex] = updatedVinyl;
            return updatedVinyls;
          });

          setLoadedImages((prevLoadedImages) => [...prevLoadedImages, vinylId]);
        }
      } catch (error) {
        console.error(error);
      }
    }

    setIsLoadingImages(false);
  };

  const renderVinylGrid = () => {
    const filteredVinyls = limitedEditionVinyls.filter((vinyl) =>
      vinyl.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const rows = Math.ceil(filteredVinyls.length / 6);
    const vinylRows = [];

    for (let i = 0; i < rows; i++) {
      const start = i * 6;
      const end = start + 6;
      const vinylsInRow = filteredVinyls.slice(start, end);

      const vinylRow = (
        <div className="flex flex-wrap" key={i}>
          {vinylsInRow.map((vinyl: VinylData) => (
            <div key={vinyl.id} className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 p-2">
              {isLoadingImages ? (
                <div className="text-center">Loading...</div>
              ) : (
                <>
                  <img src={vinyl.cover_image} alt={vinyl.title} className="mt-2 rounded" />
                  <div className="bg-white rounded p-4 shadow">
                    <h3 className="text-lg font-bold">{vinyl.title}</h3>
                    {marketplaceData[vinyl.id] && marketplaceData[vinyl.id].length > 0 && (
                      <div>
                        <h4>Available in the following stores:</h4>
                        <ul>
                          {marketplaceData[vinyl.id].map((marketplace: MarketplaceData) => (
                            <li key={marketplace.listing_id}>
                              {marketplace.seller.username} - {marketplace.condition} - {marketplace.price}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      );

      vinylRows.push(vinylRow);
    }

    const searchInfoText = searchTerm ? `Recherche de Vinyls pour "${searchTerm}"` : 'Recent Limited Edition Vinyls';

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">{searchInfoText}</h2>
        {vinylRows}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <header className="bg-gray-800 text-white py-4">
        <div className="container mx-auto flex items-center justify-between px-4">
          <h1 className="text-xl font-bold">VinylFindr</h1>
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="px-4 py-2 rounded-lg focus:outline-none focus:ring focus:border-blue-300 text-blue-500"
            />
            <button onClick={searchVinyls} className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg">
              Search
            </button>
          </div>
        </div>
      </header>
      {isLoading ? <div>Loading...</div> : renderVinylGrid()}
    </div>
  );
};

export default VinylSearch;
