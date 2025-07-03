"""Storage service for S3/MinIO operations."""
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config

logger = logging.getLogger(__name__)


class StorageService:
    """Service for handling S3/MinIO storage operations."""
    
    def __init__(
        self,
        bucket_name: str,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region_name: str = "us-east-1"
    ):
        self.bucket_name = bucket_name
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region_name,
            config=Config(signature_version="s3v4")
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "404":
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created bucket: {self.bucket_name}")
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    raise
            else:
                logger.error(f"Error checking bucket: {e}")
                raise
    
    async def upload_file(
        self,
        file_path: str,
        object_key: str,
        metadata: Optional[Dict[str, str]] = None,
        content_type: Optional[str] = None
    ) -> str:
        """
        Upload a file to S3/MinIO.
        
        Args:
            file_path: Local file path
            object_key: S3 object key
            metadata: Optional metadata
            content_type: Optional content type
        
        Returns:
            S3 object key
        """
        try:
            extra_args = {}
            if metadata:
                extra_args["Metadata"] = metadata
            if content_type:
                extra_args["ContentType"] = content_type
            
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                object_key,
                ExtraArgs=extra_args if extra_args else None
            )
            
            logger.info(f"Uploaded file to S3: {object_key}")
            return object_key
            
        except ClientError as e:
            logger.error(f"Error uploading file: {e}")
            raise
    
    async def download_file(self, object_key: str, download_path: str) -> str:
        """
        Download a file from S3/MinIO.
        
        Args:
            object_key: S3 object key
            download_path: Local download path
        
        Returns:
            Download path
        """
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(download_path), exist_ok=True)
            
            self.s3_client.download_file(
                self.bucket_name,
                object_key,
                download_path
            )
            
            logger.info(f"Downloaded file from S3: {object_key}")
            return download_path
            
        except ClientError as e:
            logger.error(f"Error downloading file: {e}")
            raise
    
    async def delete_file(self, object_key: str) -> bool:
        """
        Delete a file from S3/MinIO.
        
        Args:
            object_key: S3 object key
        
        Returns:
            Success status
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            
            logger.info(f"Deleted file from S3: {object_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error deleting file: {e}")
            return False
    
    async def file_exists(self, object_key: str) -> bool:
        """
        Check if a file exists in S3/MinIO.
        
        Args:
            object_key: S3 object key
        
        Returns:
            Existence status
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            return True
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "404":
                return False
            logger.error(f"Error checking file existence: {e}")
            raise
    
    async def get_file_info(self, object_key: str) -> Optional[Dict[str, Any]]:
        """
        Get file metadata from S3/MinIO.
        
        Args:
            object_key: S3 object key
        
        Returns:
            File metadata
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            
            return {
                "size": response["ContentLength"],
                "last_modified": response["LastModified"],
                "content_type": response.get("ContentType"),
                "etag": response.get("ETag"),
                "metadata": response.get("Metadata", {})
            }
            
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "404":
                return None
            logger.error(f"Error getting file info: {e}")
            raise
    
    async def generate_presigned_url(
        self,
        object_key: str,
        expiration: int = 3600,
        http_method: str = "GET"
    ) -> str:
        """
        Generate a presigned URL for S3/MinIO object.
        
        Args:
            object_key: S3 object key
            expiration: URL expiration in seconds
            http_method: HTTP method (GET or PUT)
        
        Returns:
            Presigned URL
        """
        try:
            if http_method == "GET":
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": object_key
                    },
                    ExpiresIn=expiration
                )
            elif http_method == "PUT":
                url = self.s3_client.generate_presigned_url(
                    "put_object",
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": object_key
                    },
                    ExpiresIn=expiration
                )
            else:
                raise ValueError(f"Unsupported HTTP method: {http_method}")
            
            return url
            
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise
    
    async def list_files(
        self,
        prefix: str = "",
        max_keys: int = 1000,
        delimiter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List files in S3/MinIO bucket.
        
        Args:
            prefix: Object key prefix
            max_keys: Maximum number of keys to return
            delimiter: Delimiter for grouping keys
        
        Returns:
            List response
        """
        try:
            params = {
                "Bucket": self.bucket_name,
                "MaxKeys": max_keys
            }
            
            if prefix:
                params["Prefix"] = prefix
            if delimiter:
                params["Delimiter"] = delimiter
            
            response = self.s3_client.list_objects_v2(**params)
            
            files = []
            for obj in response.get("Contents", []):
                files.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"]
                })
            
            return {
                "files": files,
                "directories": response.get("CommonPrefixes", []),
                "is_truncated": response.get("IsTruncated", False),
                "next_token": response.get("NextContinuationToken")
            }
            
        except ClientError as e:
            logger.error(f"Error listing files: {e}")
            raise
    
    async def copy_file(
        self,
        source_key: str,
        dest_key: str,
        source_bucket: Optional[str] = None
    ) -> str:
        """
        Copy a file within S3/MinIO.
        
        Args:
            source_key: Source object key
            dest_key: Destination object key
            source_bucket: Source bucket (if different)
        
        Returns:
            Destination key
        """
        try:
            copy_source = {
                "Bucket": source_bucket or self.bucket_name,
                "Key": source_key
            }
            
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_key
            )
            
            logger.info(f"Copied file from {source_key} to {dest_key}")
            return dest_key
            
        except ClientError as e:
            logger.error(f"Error copying file: {e}")
            raise
    
    async def create_multipart_upload(
        self,
        object_key: str,
        metadata: Optional[Dict[str, str]] = None,
        content_type: Optional[str] = None
    ) -> str:
        """
        Initiate a multipart upload.
        
        Args:
            object_key: S3 object key
            metadata: Optional metadata
            content_type: Optional content type
        
        Returns:
            Upload ID
        """
        try:
            args = {"Bucket": self.bucket_name, "Key": object_key}
            
            if metadata:
                args["Metadata"] = metadata
            if content_type:
                args["ContentType"] = content_type
            
            response = self.s3_client.create_multipart_upload(**args)
            
            return response["UploadId"]
            
        except ClientError as e:
            logger.error(f"Error creating multipart upload: {e}")
            raise
    
    async def upload_part(
        self,
        object_key: str,
        upload_id: str,
        part_number: int,
        data: bytes
    ) -> Dict[str, Any]:
        """
        Upload a part in multipart upload.
        
        Args:
            object_key: S3 object key
            upload_id: Upload ID
            part_number: Part number (1-10000)
            data: Part data
        
        Returns:
            Part info
        """
        try:
            response = self.s3_client.upload_part(
                Bucket=self.bucket_name,
                Key=object_key,
                PartNumber=part_number,
                UploadId=upload_id,
                Body=data
            )
            
            return {
                "ETag": response["ETag"],
                "PartNumber": part_number
            }
            
        except ClientError as e:
            logger.error(f"Error uploading part: {e}")
            raise
    
    async def complete_multipart_upload(
        self,
        object_key: str,
        upload_id: str,
        parts: list
    ) -> str:
        """
        Complete a multipart upload.
        
        Args:
            object_key: S3 object key
            upload_id: Upload ID
            parts: List of part info
        
        Returns:
            Object key
        """
        try:
            self.s3_client.complete_multipart_upload(
                Bucket=self.bucket_name,
                Key=object_key,
                UploadId=upload_id,
                MultipartUpload={"Parts": parts}
            )
            
            logger.info(f"Completed multipart upload: {object_key}")
            return object_key
            
        except ClientError as e:
            logger.error(f"Error completing multipart upload: {e}")
            raise
    
    async def abort_multipart_upload(
        self,
        object_key: str,
        upload_id: str
    ) -> bool:
        """
        Abort a multipart upload.
        
        Args:
            object_key: S3 object key
            upload_id: Upload ID
        
        Returns:
            Success status
        """
        try:
            self.s3_client.abort_multipart_upload(
                Bucket=self.bucket_name,
                Key=object_key,
                UploadId=upload_id
            )
            
            logger.info(f"Aborted multipart upload: {object_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error aborting multipart upload: {e}")
            return False