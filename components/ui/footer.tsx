import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="py-12">
          {/* Logo and copyright */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center group">
                <Image 
                  src="/biocol.png" 
                  width={48} 
                  height={48} 
                  alt="Bioncolab Logo"
                  className="w-10 h-10"
                />
                <span className="ml-2 text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Bioncolab
                </span>
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Bioncolab. All rights reserved.
            </p>
          </div>

          
        </div>
      </div>
    </footer>
  );
}